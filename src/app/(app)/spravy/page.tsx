import { PageHead } from "@/shared/components/PageHead";
import { Icon } from "@/shared/components/Icon";
import { ChatThread } from "@/shared/components/ChatThread";

export default function ChatPage() {
  return (
    <>
      <PageHead
        title="Katarína Vrábľová"
        sub="Vedúca jedálne"
        actions={
          <button className="iconbtn" aria-label="Detaily vlákna">
            <Icon name="info" />
          </button>
        }
      />
      <div className="max-w-[860px]">
        <ChatThread />
      </div>
    </>
  );
}
