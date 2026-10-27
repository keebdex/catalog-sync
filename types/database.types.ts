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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      announcement_dismissals: {
        Row: {
          announcement_key: string
          dismissed_at: string
          user_id: string
        }
        Insert: {
          announcement_key: string
          dismissed_at?: string
          user_id?: string
        }
        Update: {
          announcement_key?: string
          dismissed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_dismissals_announcement_key_fkey"
            columns: ["announcement_key"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "announcement_dismissals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          audience: string
          color: string
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_url: string | null
          description: string | null
          display: string
          ends_at: string | null
          icon: string | null
          key: string
          priority: number
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          color?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          description?: string | null
          display?: string
          ends_at?: string | null
          icon?: string | null
          key: string
          priority?: number
          starts_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          color?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          description?: string | null
          display?: string
          ends_at?: string | null
          icon?: string | null
          key?: string
          priority?: number
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      artisan_colorways: {
        Row: {
          colorway_id: string
          created_at: string
          currency: string | null
          deleted: boolean | null
          description: string | null
          fts: unknown
          id: number
          img: string | null
          maker_id: string
          maker_sculpt_id: string
          name: string
          order: number | null
          overridden_fields: string[]
          photo_credit: string | null
          price: number | null
          qty: number | null
          release: string | null
          review_note: string | null
          review_status: Database["public"]["Enums"]["review_status"] | null
          sale_type: Database["public"]["Enums"]["sale_format"] | null
          sculpt_id: string
          source: string | null
          source_document_id: string | null
          stem: string[] | null
          submitted_by: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          colorway_id: string
          created_at?: string
          currency?: string | null
          deleted?: boolean | null
          description?: string | null
          fts?: unknown
          id?: number
          img?: string | null
          maker_id: string
          maker_sculpt_id: string
          name: string
          order?: number | null
          overridden_fields?: string[]
          photo_credit?: string | null
          price?: number | null
          qty?: number | null
          release?: string | null
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["review_status"] | null
          sale_type?: Database["public"]["Enums"]["sale_format"] | null
          sculpt_id: string
          source?: string | null
          source_document_id?: string | null
          stem?: string[] | null
          submitted_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          colorway_id?: string
          created_at?: string
          currency?: string | null
          deleted?: boolean | null
          description?: string | null
          fts?: unknown
          id?: number
          img?: string | null
          maker_id?: string
          maker_sculpt_id?: string
          name?: string
          order?: number | null
          overridden_fields?: string[]
          photo_credit?: string | null
          price?: number | null
          qty?: number | null
          release?: string | null
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["review_status"] | null
          sale_type?: Database["public"]["Enums"]["sale_format"] | null
          sculpt_id?: string
          source?: string | null
          source_document_id?: string | null
          stem?: string[] | null
          submitted_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artisan_colorways_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artisan_colorways_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colorways_maker_id_fkey"
            columns: ["maker_id"]
            isOneToOne: false
            referencedRelation: "artisan_makers"
            referencedColumns: ["maker_id"]
          },
          {
            foreignKeyName: "colorways_maker_sculpt_id_fkey"
            columns: ["maker_sculpt_id"]
            isOneToOne: false
            referencedRelation: "artisan_sculpts"
            referencedColumns: ["maker_sculpt_id"]
          },
        ]
      }
      artisan_makers: {
        Row: {
          artisancollector: string | null
          bio: string | null
          contributors: Json[] | null
          country_origin: string | null
          deleted: boolean
          disable_google_sync: boolean
          discord: string | null
          document_ids: Json[] | null
          founded: string | null
          fts: unknown
          id: number
          instagram: string | null
          invertible_logo: boolean | null
          maker_id: string
          name: string
          review_status: Database["public"]["Enums"]["review_status"] | null
          submitted_by: string | null
          updated_at: string | null
          verified: boolean
          verified_at: string | null
          verified_by: string | null
          website: string | null
        }
        Insert: {
          artisancollector?: string | null
          bio?: string | null
          contributors?: Json[] | null
          country_origin?: string | null
          deleted?: boolean
          disable_google_sync?: boolean
          discord?: string | null
          document_ids?: Json[] | null
          founded?: string | null
          fts?: unknown
          id?: never
          instagram?: string | null
          invertible_logo?: boolean | null
          maker_id: string
          name: string
          review_status?: Database["public"]["Enums"]["review_status"] | null
          submitted_by?: string | null
          updated_at?: string | null
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
        }
        Update: {
          artisancollector?: string | null
          bio?: string | null
          contributors?: Json[] | null
          country_origin?: string | null
          deleted?: boolean
          disable_google_sync?: boolean
          discord?: string | null
          document_ids?: Json[] | null
          founded?: string | null
          fts?: unknown
          id?: never
          instagram?: string | null
          invertible_logo?: boolean | null
          maker_id?: string
          name?: string
          review_status?: Database["public"]["Enums"]["review_status"] | null
          submitted_by?: string | null
          updated_at?: string | null
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artisan_makers_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artisan_makers_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      artisan_sculpts: {
        Row: {
          cast: string | null
          collection: string | null
          created_at: string
          deleted: boolean
          design: string | null
          fts: unknown
          id: number
          is_revision_of: string | null
          maker_id: string
          maker_sculpt_id: string
          name: string
          overridden_fields: string[]
          profile: string | null
          release: string | null
          review_status: Database["public"]["Enums"]["review_status"] | null
          sculpt_id: string
          source: string
          source_document_id: string | null
          source_slug: string | null
          story: string | null
          submitted_by: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          cast?: string | null
          collection?: string | null
          created_at?: string
          deleted?: boolean
          design?: string | null
          fts?: unknown
          id?: number
          is_revision_of?: string | null
          maker_id: string
          maker_sculpt_id: string
          name: string
          overridden_fields?: string[]
          profile?: string | null
          release?: string | null
          review_status?: Database["public"]["Enums"]["review_status"] | null
          sculpt_id: string
          source: string
          source_document_id?: string | null
          source_slug?: string | null
          story?: string | null
          submitted_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          cast?: string | null
          collection?: string | null
          created_at?: string
          deleted?: boolean
          design?: string | null
          fts?: unknown
          id?: number
          is_revision_of?: string | null
          maker_id?: string
          maker_sculpt_id?: string
          name?: string
          overridden_fields?: string[]
          profile?: string | null
          release?: string | null
          review_status?: Database["public"]["Enums"]["review_status"] | null
          sculpt_id?: string
          source?: string
          source_document_id?: string | null
          source_slug?: string | null
          story?: string | null
          submitted_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artisan_sculpts_is_revision_of_fkey"
            columns: ["is_revision_of"]
            isOneToOne: false
            referencedRelation: "artisan_sculpts"
            referencedColumns: ["maker_sculpt_id"]
          },
          {
            foreignKeyName: "artisan_sculpts_maker_id_fkey"
            columns: ["maker_id"]
            isOneToOne: false
            referencedRelation: "artisan_makers"
            referencedColumns: ["maker_id"]
          },
          {
            foreignKeyName: "artisan_sculpts_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artisan_sculpts_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      colors: {
        Row: {
          code: string
          created_at: string
          fts: unknown
          hex: string
          id: number
          name: string | null
          system: Database["public"]["Enums"]["keyset_color_matching_system"]
        }
        Insert: {
          code: string
          created_at?: string
          fts?: unknown
          hex: string
          id?: number
          name?: string | null
          system: Database["public"]["Enums"]["keyset_color_matching_system"]
        }
        Update: {
          code?: string
          created_at?: string
          fts?: unknown
          hex?: string
          id?: number
          name?: string | null
          system?: Database["public"]["Enums"]["keyset_color_matching_system"]
        }
        Relationships: []
      }
      edit_suggestions: {
        Row: {
          applied: Json | null
          changes: Json
          created_at: string
          domain: string
          entity_id: number
          entity_type: string
          id: number
          original: Json
          parent_key: string
          reason: string | null
          review_note: string | null
          review_status: Database["public"]["Enums"]["review_status"]
          scope: string
          submitted_by: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          applied?: Json | null
          changes: Json
          created_at?: string
          domain: string
          entity_id: number
          entity_type: string
          id?: never
          original?: Json
          parent_key: string
          reason?: string | null
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["review_status"]
          scope: string
          submitted_by?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          applied?: Json | null
          changes?: Json
          created_at?: string
          domain?: string
          entity_id?: number
          entity_type?: string
          id?: never
          original?: Json
          parent_key?: string
          reason?: string | null
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["review_status"]
          scope?: string
          submitted_by?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "edit_suggestions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edit_suggestions_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feedbacks: {
        Row: {
          created_at: string
          email: string | null
          id: number
          message: string | null
          name: string | null
          resolution_note: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          submitted_by: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: number
          message?: string | null
          name?: string | null
          resolution_note?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          submitted_by?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: number
          message?: string | null
          name?: string | null
          resolution_note?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      keyboard_brands: {
        Row: {
          bio: string | null
          country_origin: string | null
          created_at: string
          discord: string | null
          fts: unknown
          id: number
          instagram: string | null
          invertible_logo: boolean
          name: string
          review_status: Database["public"]["Enums"]["review_status"] | null
          slug: string
          submitted_by: string | null
          verified_at: string | null
          verified_by: string | null
          website: string | null
        }
        Insert: {
          bio?: string | null
          country_origin?: string | null
          created_at?: string
          discord?: string | null
          fts?: unknown
          id?: number
          instagram?: string | null
          invertible_logo?: boolean
          name: string
          review_status?: Database["public"]["Enums"]["review_status"] | null
          slug: string
          submitted_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
        }
        Update: {
          bio?: string | null
          country_origin?: string | null
          created_at?: string
          discord?: string | null
          fts?: unknown
          id?: number
          instagram?: string | null
          invertible_logo?: boolean
          name?: string
          review_status?: Database["public"]["Enums"]["review_status"] | null
          slug?: string
          submitted_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "keyboard_brands_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keyboard_brands_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      keyboard_releases: {
        Row: {
          brand_keyboard_slug: string
          brand_slug: string
          case_materials: string[] | null
          created_at: string
          currency: string | null
          description: string | null
          fts: unknown
          id: number
          msrp_price: number | null
          name: string
          order: number
          pcb_types: Database["public"]["Enums"]["keyboard_pcb_type"][] | null
          plate_materials:
            | Database["public"]["Enums"]["keyboard_material"][]
            | null
          release_year: number | null
          review_status: Database["public"]["Enums"]["review_status"] | null
          submitted_by: string | null
          variant_specs: boolean | null
          verified_at: string | null
          verified_by: string | null
          weight_materials:
            | Database["public"]["Enums"]["keyboard_material"][]
            | null
        }
        Insert: {
          brand_keyboard_slug: string
          brand_slug: string
          case_materials?: string[] | null
          created_at?: string
          currency?: string | null
          description?: string | null
          fts?: unknown
          id?: number
          msrp_price?: number | null
          name: string
          order?: number
          pcb_types?: Database["public"]["Enums"]["keyboard_pcb_type"][] | null
          plate_materials?:
            | Database["public"]["Enums"]["keyboard_material"][]
            | null
          release_year?: number | null
          review_status?: Database["public"]["Enums"]["review_status"] | null
          submitted_by?: string | null
          variant_specs?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
          weight_materials?:
            | Database["public"]["Enums"]["keyboard_material"][]
            | null
        }
        Update: {
          brand_keyboard_slug?: string
          brand_slug?: string
          case_materials?: string[] | null
          created_at?: string
          currency?: string | null
          description?: string | null
          fts?: unknown
          id?: number
          msrp_price?: number | null
          name?: string
          order?: number
          pcb_types?: Database["public"]["Enums"]["keyboard_pcb_type"][] | null
          plate_materials?:
            | Database["public"]["Enums"]["keyboard_material"][]
            | null
          release_year?: number | null
          review_status?: Database["public"]["Enums"]["review_status"] | null
          submitted_by?: string | null
          variant_specs?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
          weight_materials?:
            | Database["public"]["Enums"]["keyboard_material"][]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "keyboard_releases_brand_keyboard_slug_fkey"
            columns: ["brand_keyboard_slug"]
            isOneToOne: false
            referencedRelation: "keyboards"
            referencedColumns: ["brand_keyboard_slug"]
          },
          {
            foreignKeyName: "keyboard_releases_brand_slug_fkey"
            columns: ["brand_slug"]
            isOneToOne: false
            referencedRelation: "keyboard_brands"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "keyboard_releases_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keyboard_releases_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      keyboard_variants: {
        Row: {
          brand_keyboard_slug: string
          brand_slug: string
          case_materials:
            | Database["public"]["Enums"]["keyboard_material"][]
            | null
          created_at: string
          currency: string | null
          finish_type: Database["public"]["Enums"]["keyboard_finish_type"]
          fts: unknown
          id: number
          img_back: string | null
          img_front: string | null
          msrp_price: number | null
          pcb_types: Database["public"]["Enums"]["keyboard_pcb_type"][] | null
          photo_credit: string | null
          plate_materials:
            | Database["public"]["Enums"]["keyboard_material"][]
            | null
          release_id: number | null
          release_year: number | null
          review_note: string | null
          review_status: Database["public"]["Enums"]["review_status"] | null
          sale_type: Database["public"]["Enums"]["sale_format"] | null
          submitted_by: string | null
          units_produced: number | null
          variant_name: string
          verified_at: string | null
          verified_by: string | null
          weight_materials:
            | Database["public"]["Enums"]["keyboard_material"][]
            | null
        }
        Insert: {
          brand_keyboard_slug: string
          brand_slug: string
          case_materials?:
            | Database["public"]["Enums"]["keyboard_material"][]
            | null
          created_at?: string
          currency?: string | null
          finish_type: Database["public"]["Enums"]["keyboard_finish_type"]
          fts?: unknown
          id?: never
          img_back?: string | null
          img_front?: string | null
          msrp_price?: number | null
          pcb_types?: Database["public"]["Enums"]["keyboard_pcb_type"][] | null
          photo_credit?: string | null
          plate_materials?:
            | Database["public"]["Enums"]["keyboard_material"][]
            | null
          release_id?: number | null
          release_year?: number | null
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["review_status"] | null
          sale_type?: Database["public"]["Enums"]["sale_format"] | null
          submitted_by?: string | null
          units_produced?: number | null
          variant_name: string
          verified_at?: string | null
          verified_by?: string | null
          weight_materials?:
            | Database["public"]["Enums"]["keyboard_material"][]
            | null
        }
        Update: {
          brand_keyboard_slug?: string
          brand_slug?: string
          case_materials?:
            | Database["public"]["Enums"]["keyboard_material"][]
            | null
          created_at?: string
          currency?: string | null
          finish_type?: Database["public"]["Enums"]["keyboard_finish_type"]
          fts?: unknown
          id?: never
          img_back?: string | null
          img_front?: string | null
          msrp_price?: number | null
          pcb_types?: Database["public"]["Enums"]["keyboard_pcb_type"][] | null
          photo_credit?: string | null
          plate_materials?:
            | Database["public"]["Enums"]["keyboard_material"][]
            | null
          release_id?: number | null
          release_year?: number | null
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["review_status"] | null
          sale_type?: Database["public"]["Enums"]["sale_format"] | null
          submitted_by?: string | null
          units_produced?: number | null
          variant_name?: string
          verified_at?: string | null
          verified_by?: string | null
          weight_materials?:
            | Database["public"]["Enums"]["keyboard_material"][]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "keyboard_variants_brand_keyboard_slug_fkey"
            columns: ["brand_keyboard_slug"]
            isOneToOne: false
            referencedRelation: "keyboards"
            referencedColumns: ["brand_keyboard_slug"]
          },
          {
            foreignKeyName: "keyboard_variants_brand_slug_fkey"
            columns: ["brand_slug"]
            isOneToOne: false
            referencedRelation: "keyboard_brands"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "keyboard_variants_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "keyboard_releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keyboard_variants_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keyboard_variants_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      keyboards: {
        Row: {
          brand_keyboard_slug: string
          brand_slug: string
          created_at: string
          derived_from: string | null
          description: string | null
          form_factor: Database["public"]["Enums"]["keyboard_form_factor"]
          fts: unknown
          id: number
          mount_styles:
            | Database["public"]["Enums"]["keyboard_mounting_style"][]
            | null
          name: string
          review_status: Database["public"]["Enums"]["review_status"] | null
          slug: string
          submitted_by: string | null
          top_case_styles:
            | Database["public"]["Enums"]["keyboard_top_case_style"][]
            | null
          typing_angle: number | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          brand_keyboard_slug: string
          brand_slug: string
          created_at?: string
          derived_from?: string | null
          description?: string | null
          form_factor: Database["public"]["Enums"]["keyboard_form_factor"]
          fts?: unknown
          id?: number
          mount_styles?:
            | Database["public"]["Enums"]["keyboard_mounting_style"][]
            | null
          name: string
          review_status?: Database["public"]["Enums"]["review_status"] | null
          slug: string
          submitted_by?: string | null
          top_case_styles?:
            | Database["public"]["Enums"]["keyboard_top_case_style"][]
            | null
          typing_angle?: number | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          brand_keyboard_slug?: string
          brand_slug?: string
          created_at?: string
          derived_from?: string | null
          description?: string | null
          form_factor?: Database["public"]["Enums"]["keyboard_form_factor"]
          fts?: unknown
          id?: number
          mount_styles?:
            | Database["public"]["Enums"]["keyboard_mounting_style"][]
            | null
          name?: string
          review_status?: Database["public"]["Enums"]["review_status"] | null
          slug?: string
          submitted_by?: string | null
          top_case_styles?:
            | Database["public"]["Enums"]["keyboard_top_case_style"][]
            | null
          typing_angle?: number | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "keyboards_brand_slug_fkey"
            columns: ["brand_slug"]
            isOneToOne: false
            referencedRelation: "keyboard_brands"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "keyboards_derived_from_fkey"
            columns: ["derived_from"]
            isOneToOne: false
            referencedRelation: "keyboards"
            referencedColumns: ["brand_keyboard_slug"]
          },
          {
            foreignKeyName: "keyboards_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keyboards_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      keyset_colors: {
        Row: {
          color_id: number
          created_at: string
          id: number
          profile_keyset_id: string
        }
        Insert: {
          color_id: number
          created_at?: string
          id?: number
          profile_keyset_id: string
        }
        Update: {
          color_id?: number
          created_at?: string
          id?: number
          profile_keyset_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "keyset_colors_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keyset_colors_profile_keyset_id_fkey"
            columns: ["profile_keyset_id"]
            isOneToOne: false
            referencedRelation: "keysets"
            referencedColumns: ["profile_keyset_id"]
          },
        ]
      }
      keyset_kits: {
        Row: {
          cancelled: boolean
          created_at: string
          description: string | null
          id: number
          img: string
          kit_id: string | null
          name: string | null
          price: number | null
          profile_keyset_id: string
          qty: number | null
          review_note: string | null
          review_status: Database["public"]["Enums"]["review_status"] | null
          submitted_by: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          cancelled?: boolean
          created_at?: string
          description?: string | null
          id?: number
          img: string
          kit_id?: string | null
          name?: string | null
          price?: number | null
          profile_keyset_id: string
          qty?: number | null
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["review_status"] | null
          submitted_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          cancelled?: boolean
          created_at?: string
          description?: string | null
          id?: number
          img?: string
          kit_id?: string | null
          name?: string | null
          price?: number | null
          profile_keyset_id?: string
          qty?: number | null
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["review_status"] | null
          submitted_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "keyset_kits_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kit_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "keyset_kits_profile_keyset_id_fkey"
            columns: ["profile_keyset_id"]
            isOneToOne: false
            referencedRelation: "keysets"
            referencedColumns: ["profile_keyset_id"]
          },
          {
            foreignKeyName: "keyset_kits_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keyset_kits_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      keyset_profiles: {
        Row: {
          description: string | null
          id: number
          manufacturer: string | null
          manufacturer_id: string | null
          name: string
          profile: Database["public"]["Enums"]["keyset_profile"] | null
          profile_id: string
          review_status: Database["public"]["Enums"]["review_status"] | null
          submitted_by: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          description?: string | null
          id?: never
          manufacturer?: string | null
          manufacturer_id?: string | null
          name: string
          profile?: Database["public"]["Enums"]["keyset_profile"] | null
          profile_id: string
          review_status?: Database["public"]["Enums"]["review_status"] | null
          submitted_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          description?: string | null
          id?: never
          manufacturer?: string | null
          manufacturer_id?: string | null
          name?: string
          profile?: Database["public"]["Enums"]["keyset_profile"] | null
          profile_id?: string
          review_status?: Database["public"]["Enums"]["review_status"] | null
          submitted_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "keyset_profiles_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keyset_profiles_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      keysets: {
        Row: {
          created_at: string
          description: string | null
          designer: string | null
          end_date: string | null
          fts: unknown
          ic_date: string | null
          id: number
          img: string | null
          name: string
          order_graph: string | null
          order_history: string | null
          profile_id: string
          profile_keyset_id: string
          review_status: Database["public"]["Enums"]["review_status"] | null
          sculpt: string | null
          slug: string
          start_date: string | null
          status: string | null
          submitted_by: string | null
          url: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          designer?: string | null
          end_date?: string | null
          fts?: unknown
          ic_date?: string | null
          id?: number
          img?: string | null
          name: string
          order_graph?: string | null
          order_history?: string | null
          profile_id: string
          profile_keyset_id: string
          review_status?: Database["public"]["Enums"]["review_status"] | null
          sculpt?: string | null
          slug: string
          start_date?: string | null
          status?: string | null
          submitted_by?: string | null
          url?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          designer?: string | null
          end_date?: string | null
          fts?: unknown
          ic_date?: string | null
          id?: number
          img?: string | null
          name?: string
          order_graph?: string | null
          order_history?: string | null
          profile_id?: string
          profile_keyset_id?: string
          review_status?: Database["public"]["Enums"]["review_status"] | null
          sculpt?: string | null
          slug?: string
          start_date?: string | null
          status?: string | null
          submitted_by?: string | null
          url?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "keysets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "keyset_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "keysets_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keysets_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      kit_categories: {
        Row: {
          description: string | null
          id: number
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          description?: string | null
          id?: number
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          description?: string | null
          id?: number
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          enabled: boolean
          preference: string
          updated_at: string
          user_id: string
        }
        Insert: {
          enabled?: boolean
          preference: string
          updated_at?: string
          user_id: string
        }
        Update: {
          enabled?: boolean
          preference?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          data: Json
          entity_id: string | null
          entity_type: string | null
          group_key: string | null
          id: string
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          data?: Json
          entity_id?: string | null
          entity_type?: string | null
          group_key?: string | null
          id?: string
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          data?: Json
          entity_id?: string | null
          entity_type?: string | null
          group_key?: string | null
          id?: string
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      record_revisions: {
        Row: {
          action: string
          actor: string | null
          changes: Json | null
          created_at: string
          domain: string
          entity_id: number
          entity_type: string
          id: number
          label: string | null
          parent_key: string | null
          reverts_revision: number | null
          run_id: string | null
          scope: string | null
          snapshot: Json
          source: string
          suggestion_id: number | null
        }
        Insert: {
          action: string
          actor?: string | null
          changes?: Json | null
          created_at?: string
          domain: string
          entity_id: number
          entity_type: string
          id?: never
          label?: string | null
          parent_key?: string | null
          reverts_revision?: number | null
          run_id?: string | null
          scope?: string | null
          snapshot: Json
          source: string
          suggestion_id?: number | null
        }
        Update: {
          action?: string
          actor?: string | null
          changes?: Json | null
          created_at?: string
          domain?: string
          entity_id?: number
          entity_type?: string
          id?: never
          label?: string | null
          parent_key?: string | null
          reverts_revision?: number | null
          run_id?: string | null
          scope?: string | null
          snapshot?: Json
          source?: string
          suggestion_id?: number | null
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          avatar_url: string | null
          content: string
          created_at: string
          featured: boolean
          id: number
          name: string
          role: string | null
          status: Database["public"]["Enums"]["review_status"]
        }
        Insert: {
          avatar_url?: string | null
          content: string
          created_at?: string
          featured?: boolean
          id?: number
          name: string
          role?: string | null
          status: Database["public"]["Enums"]["review_status"]
        }
        Update: {
          avatar_url?: string | null
          content?: string
          created_at?: string
          featured?: boolean
          id?: number
          name?: string
          role?: string | null
          status?: Database["public"]["Enums"]["review_status"]
        }
        Relationships: []
      }
      user_collection_items: {
        Row: {
          artisan_item_id: number | null
          asking_price: number | null
          collection_id: string
          exchange: boolean
          id: number
          keyboard_item_id: number | null
          keyset_item_id: string | null
          order: number | null
          priority: boolean
          uid: string
        }
        Insert: {
          artisan_item_id?: number | null
          asking_price?: number | null
          collection_id: string
          exchange?: boolean
          id?: number
          keyboard_item_id?: number | null
          keyset_item_id?: string | null
          order?: number | null
          priority?: boolean
          uid: string
        }
        Update: {
          artisan_item_id?: number | null
          asking_price?: number | null
          collection_id?: string
          exchange?: boolean
          id?: number
          keyboard_item_id?: number | null
          keyset_item_id?: string | null
          order?: number | null
          priority?: boolean
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_collection_items_artisan_item_id_fkey"
            columns: ["artisan_item_id"]
            isOneToOne: false
            referencedRelation: "artisan_colorways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "user_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_collection_items_keyboard_item_id_fkey"
            columns: ["keyboard_item_id"]
            isOneToOne: false
            referencedRelation: "keyboard_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_collection_items_keyset_item_id_fkey"
            columns: ["keyset_item_id"]
            isOneToOne: false
            referencedRelation: "keysets"
            referencedColumns: ["profile_keyset_id"]
          },
          {
            foreignKeyName: "user_collection_items_uid_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_collections: {
        Row: {
          category: string
          contact: string | null
          created_at: string
          id: string
          intent: string
          message: string | null
          name: string
          published: boolean
          sort_by: string
          uid: string
        }
        Insert: {
          category?: string
          contact?: string | null
          created_at?: string
          id?: string
          intent: string
          message?: string | null
          name: string
          published?: boolean
          sort_by?: string
          uid: string
        }
        Update: {
          category?: string
          contact?: string | null
          created_at?: string
          id?: string
          intent?: string
          message?: string | null
          name?: string
          published?: boolean
          sort_by?: string
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_collections_uid_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          appearance: Json
          assignments: string[] | null
          discord: string | null
          email: string
          favorite_makers: Json
          full_name: string | null
          id: string
          qq: string | null
          reddit: string | null
          role: string | null
        }
        Insert: {
          appearance?: Json
          assignments?: string[] | null
          discord?: string | null
          email: string
          favorite_makers?: Json
          full_name?: string | null
          id: string
          qq?: string | null
          reddit?: string | null
          role?: string | null
        }
        Update: {
          appearance?: Json
          assignments?: string[] | null
          discord?: string | null
          email?: string
          favorite_makers?: Json
          full_name?: string | null
          id?: string
          qq?: string | null
          reddit?: string | null
          role?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_edit_suggestion: {
        Args: { p_changes?: Json; p_id: number }
        Returns: Json
      }
      can_manage: { Args: { scope: string }; Returns: boolean }
      can_manage_any: { Args: never; Returns: boolean }
      child_submission_can_modify: {
        Args: {
          child_status: Database["public"]["Enums"]["review_status"]
          child_submitted_by: string
          parent_rejected_ok?: boolean
          parent_status: Database["public"]["Enums"]["review_status"]
          parent_submitted_by: string
          scope: string
        }
        Returns: boolean
      }
      child_submission_can_view: {
        Args: {
          child_status: Database["public"]["Enums"]["review_status"]
          child_submitted_by: string
          parent_status: Database["public"]["Enums"]["review_status"]
          parent_submitted_by: string
          scope: string
        }
        Returns: boolean
      }
      child_submission_write_is_valid: {
        Args: {
          child_status: Database["public"]["Enums"]["review_status"]
          child_submitted_by: string
          child_verified_at: string
          child_verified_by: string
          own_pending_parent_ok?: boolean
          parent_rejected_ok?: boolean
          parent_status: Database["public"]["Enums"]["review_status"]
          parent_submitted_by: string
          proposal_extra_ok?: boolean
          scope: string
        }
        Returns: boolean
      }
      dismiss_announcement: { Args: { p_key: string }; Returns: undefined }
      edit_suggestion_details: {
        Args: { p_entity_id: number; p_entity_type: string }
        Returns: Json
      }
      edit_suggestion_field_allowed: {
        Args: { p_entity_type: string; p_key: string }
        Returns: boolean
      }
      edit_suggestion_protected_fields: {
        Args: { p_entity_type: string }
        Returns: string[]
      }
      edit_suggestion_table: {
        Args: { p_entity_type: string }
        Returns: string
      }
      edit_suggestion_virtual_field: {
        Args: { p_entity_type: string; p_key: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_official_review_status: {
        Args: { s: Database["public"]["Enums"]["review_status"] }
        Returns: boolean
      }
      keyset_color_ids: {
        Args: { p_profile_keyset_id: string }
        Returns: number[]
      }
      mark_all_notifications_read: { Args: never; Returns: number }
      merge_dismissals: { Args: { p_keys: string[] }; Returns: number }
      parse_colors_change: {
        Args: { p_current: number[]; p_value: Json }
        Returns: Json
      }
      push_notification: {
        Args: {
          p_actor_id: string
          p_data?: Json
          p_entity_id: string
          p_entity_type: string
          p_group_key?: string
          p_preference?: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      record_revision_ignored_fields: { Args: never; Returns: string[] }
      revert_revision: {
        Args: { p_id: number; p_mode?: string }
        Returns: Json
      }
      revision_actors: {
        Args: { p_ids: string[] }
        Returns: {
          avatar: string
          id: string
          name: string
        }[]
      }
      revision_source: { Args: never; Returns: Record<string, unknown> }
      submission_details: {
        Args: { p_row: Json; p_table: string }
        Returns: Json
      }
      unread_count: { Args: never; Returns: number }
    }
    Enums: {
      currency:
        | "USD"
        | "EUR"
        | "SGD"
        | "AUD"
        | "MYR"
        | "VND"
        | "CNY"
        | "KRW"
        | "JPY"
        | "GBP"
        | "CAD"
      keyboard_finish_type:
        | "Anodized"
        | "E-Coat"
        | "Cerakote"
        | "Polycarbonate"
        | "Powder Coat"
        | "Raw"
        | "PVD"
        | "Mirror"
      keyboard_form_factor:
        | "40%"
        | "60%"
        | "65%"
        | "70%"
        | "75%"
        | "TKL"
        | "Full-size"
        | "1800"
        | "96%"
        | "Alice"
        | "Arisu"
        | "Numpad"
      keyboard_material:
        | "Aluminum"
        | "Brass"
        | "Stainless Steel"
        | "Copper"
        | "FR4"
        | "Polycarbonate"
        | "POM"
        | "Carbon Fiber"
        | "Wood"
        | "Polypropylene"
      keyboard_mounting_style:
        | "Tray"
        | "Top"
        | "Gasket"
        | "Sandwich"
        | "Bottom"
        | "Integrated"
        | "O-ring"
        | "Plate"
      keyboard_pcb_type:
        | "Solder"
        | "Hotswap"
        | "Wireless"
        | "Solder + RGB"
        | "Hotswap + RGB"
        | "Bluetooth"
        | "Wired"
      keyboard_top_case_style: "WK" | "WKL" | "HHKB" | "F13 WK" | "F13 WKL"
      keyset_color_matching_system: "GMK" | "SP" | "Pantone" | "RAL" | "Custom"
      keyset_profile:
        | "Cherry"
        | "SA"
        | "MT3"
        | "MTNU"
        | "KAT"
        | "DCS"
        | "DSS"
        | "DSA"
        | "XDA"
        | "KAM"
      keyset_profile_group: "Cherry" | "SA"
      keyset_status:
        | "Interest Check"
        | "Scheduled"
        | "Live"
        | "In Production"
        | "Shipping"
        | "Complete"
        | "Cancelled"
      module: "Artisan" | "Keyset" | "Keyboard"
      review_status: "Pending" | "Approved" | "Rejected"
      sale_format:
        | "Raffle"
        | "FCFS"
        | "Fulfillment"
        | "Giveaway"
        | "Commission"
        | "Auction"
        | "Friends & Family"
      user_role: "admin" | "editor" | "maker" | "designer" | "donator"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      currency: [
        "USD",
        "EUR",
        "SGD",
        "AUD",
        "MYR",
        "VND",
        "CNY",
        "KRW",
        "JPY",
        "GBP",
        "CAD",
      ],
      keyboard_finish_type: [
        "Anodized",
        "E-Coat",
        "Cerakote",
        "Polycarbonate",
        "Powder Coat",
        "Raw",
        "PVD",
        "Mirror",
      ],
      keyboard_form_factor: [
        "40%",
        "60%",
        "65%",
        "70%",
        "75%",
        "TKL",
        "Full-size",
        "1800",
        "96%",
        "Alice",
        "Arisu",
        "Numpad",
      ],
      keyboard_material: [
        "Aluminum",
        "Brass",
        "Stainless Steel",
        "Copper",
        "FR4",
        "Polycarbonate",
        "POM",
        "Carbon Fiber",
        "Wood",
        "Polypropylene",
      ],
      keyboard_mounting_style: [
        "Tray",
        "Top",
        "Gasket",
        "Sandwich",
        "Bottom",
        "Integrated",
        "O-ring",
        "Plate",
      ],
      keyboard_pcb_type: [
        "Solder",
        "Hotswap",
        "Wireless",
        "Solder + RGB",
        "Hotswap + RGB",
        "Bluetooth",
        "Wired",
      ],
      keyboard_top_case_style: ["WK", "WKL", "HHKB", "F13 WK", "F13 WKL"],
      keyset_color_matching_system: ["GMK", "SP", "Pantone", "RAL", "Custom"],
      keyset_profile: [
        "Cherry",
        "SA",
        "MT3",
        "MTNU",
        "KAT",
        "DCS",
        "DSS",
        "DSA",
        "XDA",
        "KAM",
      ],
      keyset_profile_group: ["Cherry", "SA"],
      keyset_status: [
        "Interest Check",
        "Scheduled",
        "Live",
        "In Production",
        "Shipping",
        "Complete",
        "Cancelled",
      ],
      module: ["Artisan", "Keyset", "Keyboard"],
      review_status: ["Pending", "Approved", "Rejected"],
      sale_format: [
        "Raffle",
        "FCFS",
        "Fulfillment",
        "Giveaway",
        "Commission",
        "Auction",
        "Friends & Family",
      ],
      user_role: ["admin", "editor", "maker", "designer", "donator"],
    },
  },
} as const
