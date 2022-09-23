declare function addOverlayListener(event: OverlayEvent | CactbotEvent, fn: Function): void;
declare function removeOverlayListener(event: OverlayEvent | CactbotEvent, fn: Function): void;
declare function callOverlayHandler(event: any): any;
declare function startOverlayEvents(): void;

type OverlayEvent =
  | "CombatData"
  | "LogLine"
  | "ChangeZone"
  | "ChangePrimaryPlayer"
  | "FileChanged"
  | "OnlineStatusChanged"
  | "PartyChanged"
  | "BroadcastMessage"
  | "EnmityTargetData"
  | "onForceReload"
  | "onGameExistsEvent"
  | "onGameActiveChangedEvent"
  | "onLogEvent"
  | "onImportLogEvent"
  | "onInCombatChangedEvent"
  | "onZoneChangedEvent"
  | "onFateEvent"
  | "onCEEvent"
  | "onPlayerDied"
  | "onPartyWipe"
  | "onPlayerChangedEvent"
  | "onUserFileChanged"
  | "MiniParse"
  | "ImportedLogLines"
  | "EnmityAggroList";
type CactbotEvent =
  | "onForceReload"
  | "onGameExistsEvent"
  | "onGameActiveChangedEvent"
  | "onLogEvent"
  | "onImportLogEvent"
  | "onInCombatChangedEvent"
  | "onZoneChangedEvent"
  | "onPlayerDied"
  | "onPartyWipe"
  | "onFateEvent"
  | "onPlayerChangedEvent"
  | "onSendSaveData"
  | "onDataFilesRead"
  | "onInitializeOverlay";

declare interface EnmityTargetDataEvent {
  type: string;
  Target: Target;
  Focus?: any;
  Hover?: any;
  TargetOfTarget?: any;
  Entries?: any;
}

interface Target {
  ID: number;
  OwnerID: number;
  Type: number;
  MonsterType: number;
  Status: number;
  ModelStatus: number;
  AggressionStatus: number;
  TargetID: number;
  IsTargetable: boolean;
  Job: number;
  Name: string;
  CurrentHP: number;
  MaxHP: number;
  PosX: number;
  PosY: number;
  PosZ: number;
  Rotation: number;
  Radius: number;
  Distance: string;
  EffectiveDistance: string;
  Effects: Effect[];
}

interface Effect {
  BuffID: number;
  Stack: number;
  Timer: number;
  ActorID: number;
  isOwner: boolean;
}
