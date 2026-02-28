type SubscriptionStatusRow = {
  status: string | null;
};

type MaybeSingleResult<T> = Promise<{ data: T | null }>;

class SupabaseQueryBuilder {
  private table: string;
  private selectedColumn = "*";
  private filters: Record<string, string> = {};

  constructor(table: string) {
    this.table = table;
  }

  select(column: string) {
    this.selectedColumn = column;
    return this;
  }

  eq(column: string, value: string) {
    this.filters[column] = value;
    return this;
  }

  async maybeSingle(): MaybeSingleResult<SubscriptionStatusRow> {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return { data: null };
    }

    const params = new URLSearchParams();
    params.set("select", this.selectedColumn);

    for (const [column, value] of Object.entries(this.filters)) {
      params.set(column, `eq.${value}`);
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/${this.table}?${params.toString()}`, {
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return { data: null };
    }

    const rows = (await response.json()) as SubscriptionStatusRow[];
    return { data: rows[0] ?? null };
  }
}

class SupabaseAdminClient {
  from(table: string) {
    return new SupabaseQueryBuilder(table);
  }
}

export const supabaseAdmin = new SupabaseAdminClient();
