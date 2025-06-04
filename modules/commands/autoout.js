const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "الاوامر",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "عزيز",
  description: "يعرض قائمة الأوامر من المجلد",
  commandCategory: "مساعدة",
  usages: "الاوامر",
  cooldowns: 5
};

module.exports.run = async function ({ api, event }) {
  const commandPath = __dirname; // مجلد الأوامر الحالي
  const files = fs.readdirSync(commandPath);

  // تصفية الأوامر العربية فقط
  const arabicCommands = files
    .filter(file => file.endsWith(".js"))
    .map(file => {
      try {
        const command = require(path.join(commandPath, file));
        if (command.config && /^[\u0600-\u06FF\s\-]+$/.test(command.config.name)) {
          return `• ${command.config.name}`;
        }
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean);

  if (arabicCommands.length === 0) {
    return api.sendMessage("❌ لم يتم العثور على أوامر عربية!", event.threadID, event.messageID);
  }

  const message = `
╭───『 📜 قائمة الأوامر العربية 』───╮

${arabicCommands.join("\n")}

╰──── 『 🤖 بوت هيناتا تشان 』────╯
👤 المطور: عزيز
📎 fb.com/aziz.jr.945350
`;

  return api.sendMessage(message, event.threadID, event.messageID);
};
