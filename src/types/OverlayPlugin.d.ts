declare function addOverlayListener(event: OverlayEvent, fn: Function): void;
declare function removeOverlayListener(event: OverlayEvent, fn: Function): void;
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
