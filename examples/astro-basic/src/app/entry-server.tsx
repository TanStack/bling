import { hasHandler, handleEvent } from "@tanstack/bling/server";
import type { APIContext } from "astro";
import * as ReactDOM from "react-dom/server";
import { App } from "./root";

export const requestHandler = ({ request }: APIContext) => {
  if (hasHandler(new URL(request.url).pathname)) {
    return handleEvent({
      request,
      __hasRequest: true,
    });
  }

  return new Response(ReactDOM.renderToString(<App />), {
    headers: {
      "content-type": "text/html",
    },
  });
};
