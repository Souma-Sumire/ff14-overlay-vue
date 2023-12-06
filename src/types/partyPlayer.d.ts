interface Player {
  id: string;
  name: string;
  inParty: boolean;
  job: number;
}

interface PlayerRuntime extends Player {
  rp?: string;
  specify?: boolean;
}

type Role = "tank" | "healer" | "dps" | "unknown";
