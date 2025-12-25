import App from "@/components/App";
import { getFamilyData } from "@/lib/data";

export default async function Home() {
  const data = await getFamilyData();

  return <App initialData={data} />;
}
