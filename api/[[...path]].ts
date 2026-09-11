import serverless from "serverless-http";
import { app } from "../server/index";

export const config = {
  maxDuration: 30,
  api: {
    bodyParser: false,
  },
};

export default serverless(app, {
  binary: ["image/*", "application/octet-stream"],
});
