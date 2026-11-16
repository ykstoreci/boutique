import webpush from "web-push";
import fs from "node:fs";
import path from "node:path";

function generate() {
  const vapidKeys = webpush.generateVAPIDKeys();
  console.log("=== CLÉS VAPID GÉNÉRÉES ===");
  console.log("Clé publique  :", vapidKeys.publicKey);
  console.log("Clé privée    :", vapidKeys.privateKey);
  console.log("===========================");

  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf-8");
    if (envContent.includes("VAPID_PUBLIC_KEY=")) {
      envContent = envContent.replace(/VAPID_PUBLIC_KEY=.*/g, `VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
    } else {
      envContent += `\nVAPID_PUBLIC_KEY=${vapidKeys.publicKey}`;
    }

    if (envContent.includes("VAPID_PRIVATE_KEY=")) {
      envContent = envContent.replace(/VAPID_PRIVATE_KEY=.*/g, `VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
    } else {
      envContent += `\nVAPID_PRIVATE_KEY=${vapidKeys.privateKey}`;
    }

    if (!envContent.includes("VAPID_SUBJECT=")) {
      envContent += `\nVAPID_SUBJECT=mailto:admin@boutique.local`;
    }

    fs.writeFileSync(envPath, envContent, "utf-8");
    console.log("Les clés VAPID ont été écrites dans le fichier .env");
  } else {
    console.log("Fichier .env introuvable. Veuillez copier les clés ci-dessus dans votre configuration.");
  }
}

generate();

