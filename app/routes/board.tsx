import { Outlet } from "react-router";

export function meta() {
  return [{ title: "Board · HackHunt" }];
}

export default function BoardLayout() {
  return <Outlet />;
}
