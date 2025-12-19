import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";

export enum AlertCondition {
    ABOVE = 'ABOVE',
    BELOW = 'BELOW'
}

@Entity()
export class Alert {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column("varchar")
    userId!: string;

    @Column("varchar")
    symbol!: string;

    @Column("decimal", { precision: 15, scale: 2 })
    targetPrice!: number;

    @Column({
        type: "enum",
        enum: AlertCondition,
    })
    condition!: AlertCondition;

    @Column("varchar")
    channelId!: string;

    @ManyToOne(() => User, (user) => user.alerts)
    @JoinColumn({ name: "userId" })
    user!: User;
}
