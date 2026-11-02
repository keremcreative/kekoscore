import { cookies } from "next/headers";
import { FAV_COOKIE, parseFavs, type Fav } from "./favs";

export async function serverFavs(): Promise<Fav[]> {
  return parseFavs((await cookies()).get(FAV_COOKIE)?.value);
}
