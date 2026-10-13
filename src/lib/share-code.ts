import { db } from "./db";
import { shortCode } from "./codes";

type Kind = "share" | "code" | "room";

/** Generates a short code that is unused in its table. */
export async function uniqueCode(kind: Kind, length: number): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    // Grow the code by one character if we keep colliding (dense keyspace).
    const code = shortCode(length + (attempt >= 6 ? 1 : 0));
    const exists =
      kind === "share"
        ? await db.share.findUnique({ where: { code }, select: { id: true } })
        : kind === "code"
          ? await db.codeShare.findUnique({ where: { code }, select: { id: true } })
          : await db.room.findUnique({ where: { code }, select: { id: true } });
    if (!exists) return code;
  }
  throw new Error("could not allocate a short code");
}

export const CODE_LEN = { share: 6, code: 6, room: 5 } as const;
