import { Entity, PrimaryColumn, Column, OneToMany } from "typeorm";
import { PortfolioItem } from "./PortfolioItem";
import { Alert } from "./Alert";

@Entity()
export class User {
    @PrimaryColumn("varchar")
    userId!: string; // Discord User ID

    @Column("decimal", { precision: 15, scale: 2, default: 0 })
    balance!: number;

    @OneToMany(() => PortfolioItem, (item) => item.user)
    portfolio!: PortfolioItem[];

    @OneToMany(() => Alert, (alert) => alert.user)
    alerts!: Alert[];
}
