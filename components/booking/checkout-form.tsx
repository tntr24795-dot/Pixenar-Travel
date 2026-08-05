"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe, type Stripe, type StripeElements, type StripePaymentElement } from "@stripe/stripe-js";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCents } from "@/lib/utils";
import { BOOKING_HOLD_MINUTES } from "@/constants";
import type { Tables } from "@/types/database";

type Booking = Tables<"bookings">;
type PriceItem = Tables<"booking_price_items">;

interface CheckoutFormProps {
  listingId: string;
  listingSlug: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  infants: number;
  pets: number;
}

type Step =
  | "creating_hold"
  | "creating_intent"
  | "ready"
  | "submitting"
  | "success"
  | "expired"
  | "error";

let stripePromise: Promise<Stripe | null> | null = null;
function getStripePromise(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    stripePromise = key ? loadStripe(key) : Promise.resolve(null);
  }
  return stripePromise;
}

export function CheckoutForm(props: CheckoutFormProps) {
  const router = useRouter();

  const [step, setStep] = useState<Step>("creating_hold");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [priceItems, setPriceItems] = useState<PriceItem[]>([]);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const paymentElementContainerRef = useRef<HTMLDivElement | null>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const paymentElementRef = useRef<StripePaymentElement | null>(null);
  const holdCreatedRef = useRef(false);

  // ---------------------------------------------------------------------
  // Step 1: create the 15-minute hold on mount. calculateBookingQuote() is
  // recomputed server-side inside createBookingHold() from fresh listing
  // data — nothing priced here on the client is ever trusted.
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (holdCreatedRef.current) return;
    holdCreatedRef.current = true;

    (async () => {
      try {
        const res = await fetch("/api/bookings/hold", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listingId: props.listingId,
            checkIn: props.checkIn,
            checkOut: props.checkOut,
            adults: props.adults,
            children: props.children,
            infants: props.infants,
            pets: props.pets,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setErrorMessage(json.error ?? "We couldn't hold these dates. Please try again.");
          setStep("error");
          return;
        }
        setBooking(json.booking as Booking);
        setPriceItems((json.priceItems ?? []) as PriceItem[]);
        setStep("creating_intent");
      } catch (err) {
        console.error(err);
        setErrorMessage("We couldn't reach the server. Please check your connection and retry.");
        setStep("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------
  // Step 2: once the hold exists, request its PaymentIntent client secret.
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (step !== "creating_intent" || !booking) return;

    (async () => {
      try {
        const res = await fetch(`/api/bookings/${booking.id}/checkout`, { method: "POST" });
        const json = await res.json();
        if (!res.ok) {
          if (res.status === 410) {
            setStep("expired");
            return;
          }
          setErrorMessage(json.error ?? "We couldn't start payment for this booking.");
          setStep("error");
          return;
        }

        const stripe = await getStripePromise();
        if (!stripe) {
          setErrorMessage(
            "Payments aren't configured yet (missing publishable key). Please try again later."
          );
          setStep("error");
          return;
        }
        stripeRef.current = stripe;

        const elements = stripe.elements({
          clientSecret: json.clientSecret,
          appearance: { theme: "stripe" },
        });
        elementsRef.current = elements;
        const paymentElement = elements.create("payment");
        paymentElementRef.current = paymentElement;
        if (paymentElementContainerRef.current) {
          paymentElement.mount(paymentElementContainerRef.current);
        }

        setStep("ready");
      } catch (err) {
        console.error(err);
        setErrorMessage("We couldn't start payment for this booking. Please try again.");
        setStep("error");
      }
    })();
  }, [step, booking]);

  useEffect(() => {
    return () => {
      paymentElementRef.current?.unmount();
    };
  }, []);

  // ---------------------------------------------------------------------
  // Countdown, driven by the server-authoritative hold_expires_at.
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!booking?.hold_expires_at) return;

    const expiresAtMs = new Date(booking.hold_expires_at).getTime();
    const tick = () => {
      const remaining = Math.max(0, Math.round((expiresAtMs - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        setStep((current) => (current === "success" ? current : "expired"));
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [booking?.hold_expires_at]);

  useEffect(() => {
    if (step !== "expired") return;
    paymentElementRef.current?.unmount();
    const timeout = setTimeout(() => {
      router.push(`/listing/${props.listingSlug}?holdExpired=1`);
    }, 3500);
    return () => clearTimeout(timeout);
  }, [step, router, props.listingSlug]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const stripe = stripeRef.current;
      const elements = elementsRef.current;
      if (!stripe || !elements || !booking) return;

      setStep("submitting");
      setErrorMessage(null);

      const returnUrl = new URL(window.location.href);
      returnUrl.searchParams.set("hvBookingId", booking.id);

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl.toString() },
        redirect: "if_required",
      });

      if (error) {
        setErrorMessage(error.message ?? "Payment failed. Please try again.");
        setStep("ready");
        return;
      }

      if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
        setStep("success");
        router.push(`/account/trips/${booking.id}?booked=1`);
        return;
      }

      // Any other status (e.g. requires_action handled elsewhere) — let the
      // guest try again.
      setStep("ready");
    },
    [booking, router]
  );

  const minutesLeft = secondsLeft != null ? Math.floor(secondsLeft / 60) : BOOKING_HOLD_MINUTES;
  const displaySeconds = secondsLeft != null ? secondsLeft % 60 : 0;
  const countdownLabel = `${minutesLeft}:${displaySeconds.toString().padStart(2, "0")}`;

  if (step === "expired") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your hold expired</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Your 15-minute hold on these dates has expired. Taking you back to the listing so you
            can try again...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Payment</CardTitle>
          {secondsLeft != null && step !== "success" && (
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                secondsLeft < 60
                  ? "bg-destructive/10 text-destructive"
                  : "bg-havena-gold/20 text-havena-ink"
              }`}
            >
              Hold expires in {countdownLabel}
            </span>
          )}
        </CardHeader>
        <CardContent>
          {(step === "creating_hold" || step === "creating_intent") && (
            <p className="text-muted-foreground">Holding your dates...</p>
          )}

          {step === "error" && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {errorMessage ?? "Something went wrong."}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div ref={paymentElementContainerRef} />
            {errorMessage && step !== "error" && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}
            {(step === "ready" || step === "submitting") && (
              <Button type="submit" className="w-full" disabled={step === "submitting"}>
                {step === "submitting"
                  ? "Processing..."
                  : `Pay ${booking ? formatCents(booking.total_cents, booking.currency) : ""}`}
              </Button>
            )}
            {step === "success" && (
              <p className="text-sm font-medium text-havena-teal">
                Payment successful! Redirecting to your trip...
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Price details</CardTitle>
        </CardHeader>
        <CardContent>
          {priceItems.length === 0 ? (
            <p className="text-muted-foreground">Calculating price...</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {priceItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{item.description}</span>
                  <span>{formatCents(item.total_amount_cents, booking?.currency ?? "USD")}</span>
                </li>
              ))}
            </ul>
          )}
          {booking && (
            <>
              <Separator className="my-4" />
              <div className="flex items-center justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatCents(booking.total_cents, booking.currency)}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
