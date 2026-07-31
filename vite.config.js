import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages 배포 시 레포 이름으로 base 경로 설정
// 예: https://myelinqueen-blip.github.io/workflow-app/
export default defineConfig({
  plugins: [react()],
  base: "/workflow/",
});
