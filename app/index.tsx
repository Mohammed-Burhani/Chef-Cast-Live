/**
 * Root index — shows splash screen first
 */

import { Redirect } from "expo-router";

export default function Index() {
  return <Redirect href="/splash" />;
}
