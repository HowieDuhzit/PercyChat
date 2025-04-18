import { buildUrl } from "@/utils/buildUrl";
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body style={{ backgroundPosition: "center",backgroundImage: `url(${buildUrl("/d34e0536-6a2f-4c75-a4e5-bea2ca591861.jpg")})` }}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
