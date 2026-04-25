import express, { Application, Request, Response, NextFunction } from "express";
import path from "path";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import { httpRequestDuration } from "./metrics";
import metricsRoutes from "./routes/metricsRoutes";
import lineRoutes from "./routes/lineRoutes";
import stationRoutes from "./routes/stationRoutes";
import stationDistanceRoutes from "./routes/stationDistanceRoutes";
import ridershipRoutes from "./routes/ridershipRoutes";
import routeRoutes from "./routes/routeRoutes";
import routeTimeRoutes from "./routes/routeTimeRoutes";
import populationRoutes from "./routes/populationRoutes";
import lineCapacityRoutes from "./routes/lineCapacityRoutes";
import routeHeadwayRoutes from "./routes/routeHeadwayRoutes";
import stationSegmentTimeRoutes from "./routes/stationSegmentTimeRoutes";
import transferOverheadRoutes from "./routes/transferOverheadRoutes";
import congestionRoutes from "./routes/congestionRoutes";

const app: Application = express();

app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/metrics') return next();
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const route = req.route ? req.baseUrl + req.route.path : req.path;
    end({ method: req.method, route, status_code: String(res.statusCode) });
  });
  next();
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/metrics", metricsRoutes);

const swaggerDoc = YAML.load(path.join(process.cwd(), "doc/openapi.yaml"));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));

app.use("/api/lines", lineRoutes);
app.use("/api/stations", stationRoutes);
app.use("/api/station-distances", stationDistanceRoutes);
app.use("/api/ridership", ridershipRoutes);
app.use("/api/route", routeRoutes);
app.use("/api/route-time", routeTimeRoutes);
app.use("/api/population", populationRoutes);
app.use("/api/line-capacities", lineCapacityRoutes);
app.use("/api/route-headways", routeHeadwayRoutes);
app.use("/api/segment-times", stationSegmentTimeRoutes);
app.use("/api/transfer-overheads", transferOverheadRoutes);
app.use("/api/congestion", congestionRoutes);

export default app;
