import type { PerformanceType } from "@/resources/keigenn";
import type { DamageEffect, DamageType } from "@/utils/flags";

export interface RowVO {
	timestamp: number;
	time: string;
	id?: string;
	actionCN: string;
	action: string;
	source: string;
	target: string;
	targetId: string;
	job: string;
	jobIcon: string;
	jobEnum: number;
	amount: number;
	keigenns: Status[];
	currentHp: number;
	maxHp: number;
	effect: DamageEffect;
	type: DamageType;
	shield: string;
	povId: string;
}

export interface Status {
	name: string;
	count: number;
	effect: string;
	effectId: string;
	source: string;
	sourceId: string;
	target: string;
	targetId: string;
	expirationTimestamp: number;
	performance: PerformanceType;
	fullIcon: string;
	isPov: boolean;
	remainingDuration?: string;
}

export interface Encounter {
	key: string;
	zoneName: string;
	duration: string;
	table: RowVO[];
}
