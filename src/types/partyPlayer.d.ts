type Player = {
  id: string;
  name: string;
  rp?: string;
  inParty: boolean;
  job: number;
  specify?: boolean;
};

type Role = "tank" | "healer" | "dps" | "unknown";
