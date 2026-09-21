import { redirect } from "next/navigation";

export default function LegacyGeolocationPage() {
  redirect("/geolocalizacao/mapa");
}
