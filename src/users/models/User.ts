import { Model } from "../../database/classes/Model";
import { column } from "../../database/decorators/Column";
import { Database } from "../../database/classes/Database";
import argon2 from "argon2";

export class User extends Model {
    static table = "users";

    // Columns
    @column({ primary: true })
    id: number | null = null;

    @column()
    email: string;

    // Password is never selected, unless a login has to happen
    @column()
    protected password: string | undefined;

    @column()
    createdOn: Date;

    /**
     * @param namespace
     * @override@override@override@override@override
     */
    static getDefaultSelect(namespace?: string): string {
        return this.selectPropertiesWithout(namespace, "password");
    }

    // Methods
    static async getByID(id: number): Promise<User | undefined> {
        const [rows] = await Database.select(
            `SELECT ${this.getDefaultSelect()} FROM ${this.table} WHERE ${this.primaryKey} = ? LIMIT 1`,
            [id]
        );

        if (rows.length == 0) {
            return undefined;
        }

        // Read member + address from first row
        return this.fromRow(rows[0][this.table]);
    }

    // Methods
    static async login(email: string, password: string): Promise<User | undefined> {
        const [rows] = await Database.select(`SELECT * FROM ${this.table} WHERE email = ? LIMIT 1`, [email]);

        if (rows.length == 0) {
            // todo: check timing attack?
            return;
        }

        // Read member + address from first row
        const user = this.fromRow(rows[0][this.table]);

        if (!user?.password) {
            return;
        }

        if (await argon2.verify(user.password, password)) {
            user.password = undefined;
            return user;
        }
    }

    static async register(email: string, password: string): Promise<User | undefined> {
        const user = new User();
        user.email = email;
        const hash = await argon2.hash(password);
        user.password = hash;
        user.createdOn = new Date();

        try {
            await user.save();
        } catch (e) {
            // Duplicate key probably
            if (e.code && e.code == "ER_DUP_ENTRY") {
                return;
            }
            throw e;
        }
        user.password = undefined;
        return user;
    }
}
