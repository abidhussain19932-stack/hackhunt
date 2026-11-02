import { createGetDb } from "@agent-native/core/db";
import { registerShareableResource } from "@agent-native/core/sharing";

import * as schema from "./schema.js";

export const getDb = createGetDb(schema);
export { schema };

registerShareableResource({
  type: "opportunity",
  resourceTable: schema.opportunities,
  sharesTable: schema.opportunityShares,
  displayName: "Opportunity",
  titleColumn: "title",
  getResourcePath: (o) => `/board/${o.id}`,
  getDb,
});
