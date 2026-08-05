export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: []
      }
      amenities: {
        Row: {
          category: string
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      availability: {
        Row: {
          booking_id: string | null
          created_at: string
          custom_price_cents: number | null
          date: string
          id: string
          listing_id: string
          minimum_nights: number | null
          status: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          custom_price_cents?: number | null
          date: string
          id?: string
          listing_id: string
          minimum_nights?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          custom_price_cents?: number | null
          date?: string
          id?: string
          listing_id?: string
          minimum_nights?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      booking_price_items: {
        Row: {
          booking_id: string
          created_at: string
          description: string
          id: string
          item_type: string
          quantity: number
          total_amount_cents: number
          unit_amount_cents: number
        }
        Insert: {
          booking_id: string
          created_at?: string
          description: string
          id?: string
          item_type: string
          quantity?: number
          total_amount_cents: number
          unit_amount_cents: number
        }
        Update: {
          booking_id?: string
          created_at?: string
          description?: string
          id?: string
          item_type?: string
          quantity?: number
          total_amount_cents?: number
          unit_amount_cents?: number
        }
        Relationships: []
      }
      bookings: {
        Row: {
          adults: number
          booking_number: string
          cancelled_at: string | null
          check_in: string
          check_out: string
          children: number
          cleaning_fee_cents: number
          confirmed_at: string | null
          created_at: string
          currency: string
          discount_cents: number
          guest_id: string
          guest_service_fee_cents: number
          hold_expires_at: string | null
          host_id: string
          host_payout_cents: number
          host_service_fee_cents: number
          id: string
          infants: number
          listing_id: string
          nightly_subtotal_cents: number
          number_of_nights: number
          payment_status: string
          pet_fee_cents: number
          pets: number
          status: string
          stay: unknown
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
          tax_cents: number
          total_cents: number
          updated_at: string
        }
        Insert: {
          adults?: number
          booking_number: string
          cancelled_at?: string | null
          check_in: string
          check_out: string
          children?: number
          cleaning_fee_cents?: number
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          discount_cents?: number
          guest_id: string
          guest_service_fee_cents?: number
          hold_expires_at?: string | null
          host_id: string
          host_payout_cents?: number
          host_service_fee_cents?: number
          id?: string
          infants?: number
          listing_id: string
          nightly_subtotal_cents?: number
          number_of_nights: number
          payment_status?: string
          pet_fee_cents?: number
          pets?: number
          status?: string
          stay?: unknown
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          tax_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Update: {
          adults?: number
          booking_number?: string
          cancelled_at?: string | null
          check_in?: string
          check_out?: string
          children?: number
          cleaning_fee_cents?: number
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          discount_cents?: number
          guest_id?: string
          guest_service_fee_cents?: number
          hold_expires_at?: string | null
          host_id?: string
          host_payout_cents?: number
          host_service_fee_cents?: number
          id?: string
          infants?: number
          listing_id?: string
          nightly_subtotal_cents?: number
          number_of_nights?: number
          payment_status?: string
          pet_fee_cents?: number
          pets?: number
          status?: string
          stay?: unknown
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          tax_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      cancellations: {
        Row: {
          booking_id: string
          cancelled_by: string
          created_at: string
          guest_refund_cents: number
          host_payout_cents: number
          id: string
          platform_fee_retained_cents: number
          policy_applied: string
          reason: string | null
          status: string
        }
        Insert: {
          booking_id: string
          cancelled_by: string
          created_at?: string
          guest_refund_cents?: number
          host_payout_cents?: number
          id?: string
          platform_fee_retained_cents?: number
          policy_applied: string
          reason?: string | null
          status?: string
        }
        Update: {
          booking_id?: string
          cancelled_by?: string
          created_at?: string
          guest_refund_cents?: number
          host_payout_cents?: number
          id?: string
          platform_fee_retained_cents?: number
          policy_applied?: string
          reason?: string | null
          status?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          booking_id: string | null
          created_at: string
          guest_id: string
          host_id: string
          id: string
          listing_id: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          guest_id: string
          host_id: string
          id?: string
          listing_id: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          guest_id?: string
          host_id?: string
          id?: string
          listing_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          admin_notes: string | null
          booking_id: string
          created_at: string
          description: string | null
          id: string
          opened_by: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          booking_id: string
          created_at?: string
          description?: string | null
          id?: string
          opened_by: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          booking_id?: string
          created_at?: string
          description?: string | null
          id?: string
          opened_by?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
        }
        Relationships: []
      }
      host_profiles: {
        Row: {
          average_rating: number
          bio: string | null
          charges_enabled: boolean
          created_at: string
          id: string
          identity_status: string
          payouts_enabled: boolean
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean
          total_reviews: number
          updated_at: string
          user_id: string
        }
        Insert: {
          average_rating?: number
          bio?: string | null
          charges_enabled?: boolean
          created_at?: string
          id?: string
          identity_status?: string
          payouts_enabled?: boolean
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean
          total_reviews?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          average_rating?: number
          bio?: string | null
          charges_enabled?: boolean
          created_at?: string
          id?: string
          identity_status?: string
          payouts_enabled?: boolean
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean
          total_reviews?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      listing_amenities: {
        Row: { amenity_id: string; listing_id: string }
        Insert: { amenity_id: string; listing_id: string }
        Update: { amenity_id?: string; listing_id?: string }
        Relationships: []
      }
      listing_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          is_cover: boolean
          listing_id: string
          public_url: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_cover?: boolean
          listing_id: string
          public_url: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_cover?: boolean
          listing_id?: string
          public_url?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: []
      }
      listings: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          average_rating: number
          base_price_cents: number
          bathrooms: number
          bedrooms: number
          beds: number
          cancellation_policy: string
          check_in_time: string
          check_out_time: string
          city: string | null
          cleaning_fee_cents: number
          country: string | null
          created_at: string
          currency: string
          description: string | null
          extra_guest_fee_cents: number
          host_id: string
          id: string
          instant_book: boolean
          latitude: number | null
          longitude: number | null
          maximum_guests: number
          maximum_nights: number
          minimum_nights: number
          monthly_discount_percent: number
          pet_fee_cents: number
          postal_code: string | null
          property_type: string
          published_at: string | null
          review_count: number
          room_type: string
          security_deposit_cents: number
          slug: string
          state: string | null
          status: string
          title: string
          updated_at: string
          weekend_price_cents: number | null
          weekly_discount_percent: number
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          average_rating?: number
          base_price_cents?: number
          bathrooms?: number
          bedrooms?: number
          beds?: number
          cancellation_policy?: string
          check_in_time?: string
          check_out_time?: string
          city?: string | null
          cleaning_fee_cents?: number
          country?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          extra_guest_fee_cents?: number
          host_id: string
          id?: string
          instant_book?: boolean
          latitude?: number | null
          longitude?: number | null
          maximum_guests?: number
          maximum_nights?: number
          minimum_nights?: number
          monthly_discount_percent?: number
          pet_fee_cents?: number
          postal_code?: string | null
          property_type?: string
          published_at?: string | null
          review_count?: number
          room_type?: string
          security_deposit_cents?: number
          slug: string
          state?: string | null
          status?: string
          title: string
          updated_at?: string
          weekend_price_cents?: number | null
          weekly_discount_percent?: number
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          average_rating?: number
          base_price_cents?: number
          bathrooms?: number
          bedrooms?: number
          beds?: number
          cancellation_policy?: string
          check_in_time?: string
          check_out_time?: string
          city?: string | null
          cleaning_fee_cents?: number
          country?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          extra_guest_fee_cents?: number
          host_id?: string
          id?: string
          instant_book?: boolean
          latitude?: number | null
          longitude?: number | null
          maximum_guests?: number
          maximum_nights?: number
          minimum_nights?: number
          monthly_discount_percent?: number
          pet_fee_cents?: number
          postal_code?: string | null
          property_type?: string
          published_at?: string | null
          review_count?: number
          room_type?: string
          security_deposit_cents?: number
          slug?: string
          state?: string | null
          status?: string
          title?: string
          updated_at?: string
          weekend_price_cents?: number | null
          weekly_discount_percent?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          booking_id: string | null
          created_at: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          processing_status: string
          stripe_event_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          processing_status?: string
          stripe_event_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_status?: string
          stripe_event_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          language: string
          last_name: string | null
          phone: string | null
          role: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          language?: string
          last_name?: string | null
          phone?: string | null
          role?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          language?: string
          last_name?: string | null
          phone?: string | null
          role?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string
          guest_id: string
          host_id: string
          host_reply: string | null
          id: string
          listing_id: string
          rating_accuracy: number | null
          rating_check_in: number | null
          rating_cleanliness: number | null
          rating_communication: number | null
          rating_location: number | null
          rating_overall: number
          rating_value: number | null
          status: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string
          guest_id: string
          host_id: string
          host_reply?: string | null
          id?: string
          listing_id: string
          rating_accuracy?: number | null
          rating_check_in?: number | null
          rating_cleanliness?: number | null
          rating_communication?: number | null
          rating_location?: number | null
          rating_overall: number
          rating_value?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string
          guest_id?: string
          host_id?: string
          host_reply?: string | null
          id?: string
          listing_id?: string
          rating_accuracy?: number | null
          rating_check_in?: number | null
          rating_cleanliness?: number | null
          rating_communication?: number | null
          rating_location?: number | null
          rating_overall?: number
          rating_value?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: { created_at: string; listing_id: string; wishlist_id: string }
        Insert: { created_at?: string; listing_id: string; wishlist_id: string }
        Update: { created_at?: string; listing_id?: string; wishlist_id?: string }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_host_profiles: {
        Row: {
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          first_name: string | null
          id: string | null
          identity_status: string | null
          total_reviews: number | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      owns_host_profile: {
        Args: { p_host_profile_id: string }
        Returns: boolean
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

type DefaultSchema = Database["public"]

export type Tables<T extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])> =
  (DefaultSchema["Tables"] & DefaultSchema["Views"])[T] extends { Row: infer R } ? R : never

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Insert: infer I } ? I : never

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Update: infer U } ? U : never
