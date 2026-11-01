import { Chat } from "@/components/social/Chat";

export const metadata = { title: "Sohbet · kekoscore" };

export default function ChatPage() {
  return (
    <>
      <h1 className="page-title">Sohbet</h1>
      <Chat />
    </>
  );
}
