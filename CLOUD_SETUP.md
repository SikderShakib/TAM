# TAM Cloud Setup — নতুন Firebase প্রজেক্ট (১০ মিনিট, ফ্রি)

**সতর্কতা: OTW প্রজেক্ট ব্যবহার করবেন না। TAM-এর জন্য আলাদা নতুন প্রজেক্ট বানান।**

1. https://console.firebase.google.com → Add project → নাম: `TAM` → Create
2. Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save
3. Build → Firestore Database → Create database → Start in production mode → Create
4. Rules ট্যাবে এই রেপোর `firestore.rules` ফাইলের পুরো কনটেন্ট পেস্ট করে Publish
5. Authentication → Users → Add user → আপনার ইমেইল + পাসওয়ার্ড → User UID কপি করুন
6. Firestore → Data → Start collection → Collection ID: `roles` → Document ID: ওই UID →
   field `email` (string) = আপনার ইমেইল, field `role` (string) = `admin` → Save
7. Project settings (গিয়ার আইকন) → Your apps → Web `</>` → App nickname: `TAM Web` → Register app → firebaseConfig কপি করুন
8. `js/firebase-config.js`-এ `null`-এর জায়গায় ওই config বসিয়ে commit করুন। সাইট কয়েক মিনিটে redeploy হবে।
9. লাইভ সাইটে আপনার ইমেইল দিয়ে লগইন করুন — আপনি Admin। অন্যরা সাইন আপ করলে Pending থাকবে;
   আপনি Settings → টিম অ্যাকসেস থেকে তাদের Viewer করলে তারা শুধু দেখতে পারবে, এডিট করতে পারবে না।
