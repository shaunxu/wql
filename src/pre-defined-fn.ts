import moment from "moment";

const functions: { [key: string]: Function } = {
    dateOffset: function (amount: number, unit: string): number {
        const now = moment();
        const date = now.add(amount, unit as any);
        return date.unix();
    },
    user: function (uid: string): Promise<string> {
        return new Promise<string>(resolve => {
            return resolve(`ID-${uid}`);
        });
    },
    users: function (uids: string[]): Promise<string[]> {
        return new Promise<string[]>(resolve => {
            return resolve(uids.map(uid => `ID-${uid}`));
        });
    }
};

export class PreDefinedFunction {

    public static async invoke(name: string, args: any[]): Promise<any> {
        const fn = functions[name];
        if (fn) {
            return await fn.call(undefined, args);
        }
        else {
            throw new Error(`Invalid function ${name}`);
        }
    }

}