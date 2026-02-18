import { Composition } from "remotion";
import { Showcase } from "./Showcase";
import { SubstackVideo } from "./SubstackVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="AIModelDashboardShowcase"
        component={Showcase}
        durationInFrames={30 * 28}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="StateOfAI"
        component={SubstackVideo}
        durationInFrames={Math.ceil(147 * 30)}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
