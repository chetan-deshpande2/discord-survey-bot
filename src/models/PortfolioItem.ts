import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";

@Entity()
export class PortfolioItem {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column("varchar")
    userId!: string;

    @Column("varchar")
    symbol!: string;

    @Column("decimal", { precision: 15, scale: 6 })
    quantity!: number;

    @Column("decimal", { precision: 15, scale: 2 })
    avgPrice!: number;

    @ManyToOne(() => User, (user) => user.portfolio)
    @JoinColumn({ name: "userId" })
    user!: User;
}
