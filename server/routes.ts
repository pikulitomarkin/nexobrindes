--- a/src/api/index.ts
+++ b/src/api/index.ts
@@ -696,11 +696,11 @@
 
   // Commission Payouts routes
   app.get("/api/finance/commission-payouts", async (req, res) => {
     try {
-      const payouts = await storage.getCommissionPayouts();
-      res.json(payouts);
+      const commissionPayouts = await storage.getCommissionPayouts();
+
+      // Enrich with user names
+      const enrichedPayouts = await Promise.all(
+        commissionPayouts.map(async (payout) => {
+          const user = await storage.getUser(payout.userId);
+          return {
+            ...payout,
+            userName: user?.name || 'Usuário não encontrado'
+          };
+        })
+      );
+
+      console.log(`Returning ${enrichedPayouts.length} commission payouts`);
+      res.json(enrichedPayouts);
     } catch (error) {
-      console.error("Failed to fetch commission payouts:", error);
+      console.error("Error fetching commission payouts:", error);
       res.status(500).json({ error: "Failed to fetch commission payouts" });
     }
   });
```--- a/src/api/index.ts
+++ b/src/api/index.ts
@@ -696,11 +696,11 @@
 
   // Commission Payouts routes
   app.get("/api/finance/commission-payouts", async (req, res) => {
     try {
-      const payouts = await storage.getCommissionPayouts();
-      res.json(payouts);
+      const commissionPayouts = await storage.getCommissionPayouts();
+
+      // Enrich with user names
+      const enrichedPayouts = await Promise.all(
+        commissionPayouts.map(async (payout) => {
+          const user = await storage.getUser(payout.userId);
+          return {
+            ...payout,
+            userName: user?.name || 'Usuário não encontrado'
+          };
+        })
+      );
+
+      console.log(`Returning ${enrichedPayouts.length} commission payouts`);
+      res.json(enrichedPayouts);
     } catch (error) {
-      console.error("Failed to fetch commission payouts:", error);
+      console.error("Error fetching commission payouts:", error);
       res.status(500).json({ error: "Failed to fetch commission payouts" });
     }
   });