export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      material_request_items: {
        Row: {
          fulfilled_quantity: number
          id: string
          note: string | null
          product_id: string
          product_name: string
          product_variant: string | null
          request_id: string
          requested_quantity: number
          sort_order: number
          unit: string | null
        }
        Insert: {
          fulfilled_quantity?: number
          id?: string
          note?: string | null
          product_id: string
          product_name: string
          product_variant?: string | null
          request_id: string
          requested_quantity: number
          sort_order?: number
          unit?: string | null
        }
        Update: {
          fulfilled_quantity?: number
          id?: string
          note?: string | null
          product_id?: string
          product_name?: string
          product_variant?: string | null
          request_id?: string
          requested_quantity?: number
          sort_order?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_request_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "material_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      material_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          canceled_at: string | null
          canceled_by: string | null
          created_at: string
          created_by: string
          fulfilled_at: string | null
          id: string
          is_urgent: boolean
          note: string | null
          reject_reason: string | null
          rejected_at: string | null
          site_id: string
          status: string
          updated_at: string
          urgent_reason: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          canceled_at?: string | null
          canceled_by?: string | null
          created_at?: string
          created_by: string
          fulfilled_at?: string | null
          id?: string
          is_urgent?: boolean
          note?: string | null
          reject_reason?: string | null
          rejected_at?: string | null
          site_id: string
          status?: string
          updated_at?: string
          urgent_reason?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          canceled_at?: string | null
          canceled_by?: string | null
          created_at?: string
          created_by?: string
          fulfilled_at?: string | null
          id?: string
          is_urgent?: boolean
          note?: string | null
          reject_reason?: string | null
          rejected_at?: string | null
          site_id?: string
          status?: string
          updated_at?: string
          urgent_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_requests_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      product_aliases: {
        Row: {
          alias: string
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          alias: string
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          alias?: string
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_aliases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          id: string
          location: string | null
          min_quantity: number
          name: string
          quantity: number
          sort_order: number | null
          subcategory: string | null
          unit: string | null
          updated_at: string
          variant: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          location?: string | null
          min_quantity?: number
          name: string
          quantity?: number
          sort_order?: number | null
          subcategory?: string | null
          unit?: string | null
          updated_at?: string
          variant?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          location?: string | null
          min_quantity?: number
          name?: string
          quantity?: number
          sort_order?: number | null
          subcategory?: string | null
          unit?: string | null
          updated_at?: string
          variant?: string | null
        }
        Relationships: []
      }
      profile_sites: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          profile_id: string
          site_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          profile_id: string
          site_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          profile_id?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_sites_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_sites_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          role: string
          title: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          phone?: string | null
          role?: string
          title?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          role?: string
          title?: string | null
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          id: string
          note: string | null
          ordered_quantity: number
          product_id: string
          product_name: string
          product_variant: string | null
          purchase_order_id: string
          received_quantity: number
          sort_order: number
          spec: string | null
          unit: string | null
          unit_price: number
        }
        Insert: {
          id?: string
          note?: string | null
          ordered_quantity: number
          product_id: string
          product_name: string
          product_variant?: string | null
          purchase_order_id: string
          received_quantity?: number
          sort_order?: number
          spec?: string | null
          unit?: string | null
          unit_price?: number
        }
        Update: {
          id?: string
          note?: string | null
          ordered_quantity?: number
          product_id?: string
          product_name?: string
          product_variant?: string | null
          purchase_order_id?: string
          received_quantity?: number
          sort_order?: number
          spec?: string | null
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          delivery_terms: string | null
          due_date: string | null
          id: string
          inspection_terms: string | null
          note: string | null
          order_date: string
          payment_terms: string | null
          po_number: string
          sent_at: string | null
          ship_to: string | null
          ship_to_contact: string | null
          status: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          delivery_terms?: string | null
          due_date?: string | null
          id?: string
          inspection_terms?: string | null
          note?: string | null
          order_date?: string
          payment_terms?: string | null
          po_number: string
          sent_at?: string | null
          ship_to?: string | null
          ship_to_contact?: string | null
          status?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          delivery_terms?: string | null
          due_date?: string | null
          id?: string
          inspection_terms?: string | null
          note?: string | null
          order_date?: string
          payment_terms?: string | null
          po_number?: string
          sent_at?: string | null
          ship_to?: string | null
          ship_to_contact?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      request_templates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_public: boolean
          items: Json
          name: string
          note: string | null
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_public?: boolean
          items: Json
          name: string
          note?: string | null
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_public?: boolean
          items?: Json
          name?: string
          note?: string | null
          owner_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sites: {
        Row: {
          active: boolean
          address: string | null
          contact: string | null
          created_at: string
          end_date: string | null
          id: string
          name: string
          note: string | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          contact?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          note?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          contact?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          note?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stock_audits: {
        Row: {
          adjustment_tx_id: string | null
          counted_quantity: number
          created_at: string
          created_by: string | null
          db_quantity: number
          difference: number
          id: string
          note: string | null
          product_id: string
          resolution: string
          resolved_at: string | null
        }
        Insert: {
          adjustment_tx_id?: string | null
          counted_quantity: number
          created_at?: string
          created_by?: string | null
          db_quantity: number
          difference: number
          id?: string
          note?: string | null
          product_id: string
          resolution: string
          resolved_at?: string | null
        }
        Update: {
          adjustment_tx_id?: string | null
          counted_quantity?: number
          created_at?: string
          created_by?: string | null
          db_quantity?: number
          difference?: number
          id?: string
          note?: string | null
          product_id?: string
          resolution?: string
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_audits_adjustment_tx_id_fkey"
            columns: ["adjustment_tx_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_audits_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          canceled_at: string | null
          canceled_by: string | null
          canceled_reason: string | null
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          product_id: string
          quantity: number
          related_tx_id: string | null
          site_id: string | null
          type: string
        }
        Insert: {
          canceled_at?: string | null
          canceled_by?: string | null
          canceled_reason?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          product_id: string
          quantity: number
          related_tx_id?: string | null
          site_id?: string | null
          type: string
        }
        Update: {
          canceled_at?: string | null
          canceled_by?: string | null
          canceled_reason?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          product_id?: string
          quantity?: number
          related_tx_id?: string | null
          site_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_related_tx_id_fkey"
            columns: ["related_tx_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_product_prices: {
        Row: {
          created_at: string
          id: string
          note: string | null
          product_id: string
          unit_price: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          product_id: string
          unit_price: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          product_id?: string
          unit_price?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_product_prices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          active: boolean
          address: string | null
          business_number: string | null
          ceo: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          email: string | null
          fax: string | null
          id: string
          name: string
          note: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          business_number?: string | null
          ceo?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          email?: string | null
          fax?: string | null
          id?: string
          name: string
          note?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          business_number?: string | null
          ceo?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          email?: string | null
          fax?: string | null
          id?: string
          name?: string
          note?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      daily_transaction_summary: {
        Row: {
          day: string | null
          total_quantity: number | null
          transaction_count: number | null
          type: string | null
        }
        Relationships: []
      }
      monthly_transaction_summary: {
        Row: {
          month: string | null
          total_quantity: number | null
          transaction_count: number | null
          type: string | null
        }
        Relationships: []
      }
      top_products_by_outgoing: {
        Row: {
          category: string | null
          name: string | null
          product_id: string | null
          total_outgoing: number | null
          transaction_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      adjust_product_stock: {
        Args: {
          p_new_quantity: number
          p_product_id: string
          p_reason: string
          p_user_id: string
        }
        Returns: Json
      }
      approve_material_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      bulk_import_products: {
        Args: { p_products: Json; p_user_id: string }
        Returns: Json
      }
      cancel_material_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      create_material_request: {
        Args: {
          p_is_urgent?: boolean
          p_items: Json
          p_note: string
          p_site_id: string
          p_urgent_reason?: string
          p_user_id: string
        }
        Returns: string
      }
      create_purchase_order: {
        Args: {
          p_delivery_terms: string
          p_due_date: string
          p_inspection_terms: string
          p_items: Json
          p_note: string
          p_order_date: string
          p_payment_terms: string
          p_ship_to: string
          p_ship_to_contact: string
          p_status?: string
          p_user_id: string
          p_vendor_id: string
        }
        Returns: string
      }
      fulfill_material_request_items: {
        Args: { p_fulfillments: Json; p_request_id: string; p_user_id: string }
        Returns: Json
      }
      generate_po_number: { Args: never; Returns: string }
      get_dashboard_alert_counts: { Args: never; Returns: Json }
      get_inventory_availability: {
        Args: { p_product_ids?: string[] }
        Returns: {
          available: number
          pending: number
          product_id: string
          stock: number
        }[]
      }
      get_low_stock_products: {
        Args: never
        Returns: {
          category: string | null
          created_at: string
          id: string
          location: string | null
          min_quantity: number
          name: string
          quantity: number
          sort_order: number | null
          subcategory: string | null
          unit: string | null
          updated_at: string
          variant: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_outgoing_by_site: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          site_id: string
          site_name: string
          total_quantity: number
          transaction_count: number
        }[]
      }
      get_outgoing_by_user: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          total_quantity: number
          transaction_count: number
          user_id: string
        }[]
      }
      get_products_summary: { Args: never; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      is_site_assigned: { Args: { p_site_id: string }; Returns: boolean }
      natural_sort_key: { Args: { input: string }; Returns: string }
      process_transaction: {
        Args: {
          p_note: string
          p_product_id: string
          p_quantity: number
          p_site_id: string
          p_type: string
          p_user_id: string
        }
        Returns: Json
      }
      receive_purchase_order_items: {
        Args: { p_po_id: string; p_receipts: Json; p_user_id: string }
        Returns: Json
      }
      record_stock_audit: {
        Args: {
          p_counted_quantity: number
          p_mode: string
          p_note?: string
          p_product_id: string
        }
        Returns: Json
      }
      reject_material_request: {
        Args: { p_reason: string; p_request_id: string }
        Returns: undefined
      }
      search_products: {
        Args: { p_category?: string; p_query?: string }
        Returns: {
          category: string | null
          created_at: string
          id: string
          location: string | null
          min_quantity: number
          name: string
          quantity: number
          sort_order: number | null
          subcategory: string | null
          unit: string | null
          updated_at: string
          variant: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      undo_transaction: {
        Args: { p_reason?: string; p_tx_id: string }
        Returns: string
      }
      update_purchase_order_status: {
        Args: { p_po_id: string; p_status: string }
        Returns: undefined
      }
      update_user_role: {
        Args: { p_new_role: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
