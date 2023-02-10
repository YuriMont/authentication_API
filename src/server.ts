import express from "express";
import routers from "./routers";

const app = express();

app.use(express.json());
app.use(routers);


app.listen(3333, () => {
    console.log("HTTP Server Running!");
});

