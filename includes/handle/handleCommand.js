
module.exports = function ({ api, models, Users, Threads, Currencies }) {
  const fs = require("fs");
  const stringSimilarity = require('string-similarity');
  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const logger = require("../../utils/log.js");
  const axios = require('axios');
  const request = require('request');
  const path = require('path');
  const moment = require("moment-timezone");

  return async function ({ event }) {
    const dateNow = Date.now();
    const time = moment.tz("Asia/Ho_Chi_minh").format("HH:MM:ss DD/MM/YYYY");
    const times = process.uptime(),
          hours = Math.floor(times / (60 * 60)),
          minutes = Math.floor((times % (60 * 60)) / 60),
          seconds = Math.floor(times % 60);

    const { allowInbox, PREFIX, ADMINBOT, NDH, DeveloperMode, adminOnly, keyAdminOnly, ndhOnly, adminPaseOnly } = global.config;
    const { userBanned, threadBanned, threadInfo, threadData, commandBanned } = global.data;
    const { commands, cooldowns } = global.client;
    var { body, senderID, threadID, messageID } = event;
    var senderID = String(senderID), threadID = String(threadID);
    const threadSetting = threadData.get(threadID) || {};
    
    // منع البوت من الرد على نفسه
    if (senderID === api.getCurrentUserID()) return;
    
    // التحقق من وجود محتوى في الرسالة
    if (!body || body.trim() === '') return;
    
    // التحقق من البادئة
    const prefix = (threadSetting.PREFIX) ? threadSetting.PREFIX : PREFIX;
    if (!body.startsWith(prefix)) return;

    // التحقق من حالة البوت
    try {
        const adminCommand = require('../../modules/commands/admin.js');
        const botStatus = adminCommand.getBotStatus();
        
        // إذا كان البوت متوقف ولم يكن المستخدم أدمن
        if (!botStatus && !ADMINBOT.includes(senderID.toString())) {
            return api.sendMessage("🛑 البوت متوقف حالياً\n⚠️ يمكن للأدمن فقط استخدامه", threadID);
        }
    } catch (error) {
        // إذا فشل في التحقق، استمر بشكل طبيعي
    }

    const adminbot = require('../../config.json');
    let getDay = moment.tz("Asia/Ho_Chi_Minh").day();
    let usgPath = __dirname + '/usages.json';
    if (!fs.existsSync(usgPath)) fs.writeFileSync(usgPath, JSON.stringify({}));
    let usages = JSON.parse(fs.readFileSync(usgPath));

    

    // ═══════════════════════════════════════
    // ✨ فحص الحظر والقيود العادية ✨
    // ═══════════════════════════════════════

    if (userBanned.has(senderID) || threadBanned.has(threadID) || allowInbox == ![] && senderID == threadID) {
      if (!ADMINBOT.includes(senderID.toString()) && !NDH.includes(senderID.toString())) {
        if (userBanned.has(senderID)) {
          const { reason, dateAdded } = userBanned.get(senderID) || {};
          return api.sendMessage(`╭─────────────⭓
│ 🚫 تم حظرك من استخدام البوت
│ السبب: ${reason}
│ تاريخ الحظر: ${dateAdded}
╰─────────────⭓`, threadID, async (err, info) => {
            await new Promise(resolve => setTimeout(resolve, 5 * 1000));
            return api.unsendMessage(info.messageID);
          }, messageID);
        } else {
          if (threadBanned.has(threadID)) {
            const { reason, dateAdded } = threadBanned.get(threadID) || {};
            return api.sendMessage(`╭─────────────⭓
│ 🚫 تم حظر هذه المجموعة
│ السبب: ${reason} 
│ تاريخ الحظر: ${dateAdded}
╰─────────────⭓`, threadID, async (err, info) => {
              await new Promise(resolve => setTimeout(resolve, 5 * 1000));
              return api.unsendMessage(info.messageID);
            }, messageID);
          }
        }
      }
    }

    // استخراج الأمر بعد إزالة البادئة
    const args = body.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    var command = commands.get(commandName);
    fs.writeFileSync(usgPath, JSON.stringify(usages, null, 4));

    if (!command) {
      var allCommandName = [];
      const commandValues = global.client.commands.keys();

      for (const cmd of commandValues) allCommandName.push(cmd);
      const checker = stringSimilarity.findBestMatch(commandName, allCommandName);
      var gio = moment.tz("Asia/Ho_Chi_Minh").format("D/MM/YYYY || HH:mm:ss");
      if (checker.bestMatch.rating >= 0.5) command = global.client.commands.get(checker.bestMatch.target);
      else return api.sendMessage(`╔══════════════════════════╗
║    🤖 مساعد البوت الذكي    ║
╠══════════════════════════╣
║ ❌ عذراً، الأمر غير موجود!  ║
║                          ║
║ 💡 هل كنت تقصد:         ║
║ 『 ${prefix}${checker.bestMatch.target} 』    ║
║                          ║
║ ⏳ مدة التشغيل:          ║
║ ${hours}:${minutes}:${seconds}            ║
║                          ║
║ 🕰️ الوقت الحالي:        ║
║ ${gio}                   ║
╚══════════════════════════╝`, threadID, messageID);
    }

    if (commandBanned.get(threadID) || commandBanned.get(senderID)) {
      if (!ADMINBOT.includes(senderID)) {
        const banThreads = commandBanned.get(threadID) || [],
              banUsers = commandBanned.get(senderID) || [];
        if (banThreads.includes(command.config.name))
          return api.sendMessage(`╭─────────────⭓
│ 🚫 تم حظر الأمر "${command.config.name}"
│ في هذه المجموعة
╰─────────────⭓`, threadID, async (err, info) => {
            await new Promise(resolve => setTimeout(resolve, 5 * 1000))
            return api.unsendMessage(info.messageID);
          }, messageID);
        if (banUsers.includes(command.config.name))
          return api.sendMessage(`╭─────────────⭓
│ 🚫 تم حظرك من استخدام الأمر
│ "${command.config.name}"
╰─────────────⭓`, threadID, async (err, info) => {
            await new Promise(resolve => setTimeout(resolve, 5 * 1000));
            return api.unsendMessage(info.messageID);
          }, messageID);
      }
    }

    if (command.config.commandCategory.toLowerCase() == 'nsfw' && !global.data.threadAllowNSFW.includes(threadID) && !ADMINBOT.includes(senderID))
      return api.sendMessage(`╭─────────────⭓
│ 🔞 المحتوى المحدود العمر
│ غير مسموح في هذه المجموعة
╰─────────────⭓`, threadID, async (err, info) => {
        await new Promise(resolve => setTimeout(resolve, 5 * 1000))
        return api.unsendMessage(info.messageID);
      }, messageID);

    var threadInfo2;
    if (event.isGroup == !![])
      try {
        threadInfo2 = (threadInfo.get(threadID) || await Threads.getInfo(threadID))
        if (Object.keys(threadInfo2).length == 0) throw new Error();
      } catch (err) {
        logger("❌ خطأ في الحصول على معلومات المجموعة", "error");
      }

    // ═══════════════════════════════════════
    // 🎭 نظام الصلاحيات المطور
    // ═══════════════════════════════════════
    var permssion = 0;
    var threadInfoo = (threadInfo.get(threadID) || await Threads.getInfo(threadID));
    const find = threadInfoo.adminIDs.find(el => el.id == senderID);
    if (ADMINBOT.includes(senderID.toString())) permssion = 3;
    else if (NDH.includes(senderID.toString())) permssion = 2;
    else if (!ADMINBOT.includes(senderID) && find) permssion = 1;
    
    var quyenhan = ""
    if (command.config.hasPermssion == 1 ){
      quyenhan = "👑 مشرف المجموعة"
    } else if (command.config.hasPermssion == 2 ) {
      quyenhan = "⭐ مستأجر البوت"
    } else if(command.config.hasPermssion == 3) {
      quyenhan = "🔰 مطور البوت"
    }
    
    if (command.config.hasPermssion > permssion) return api.sendMessage(`╔══════════════════════════╗
║    🚫 صلاحية غير كافية    ║
╠══════════════════════════╣
║ الأمر: ${command.config.name}           ║
║ المطلوب: ${quyenhan}        ║
║                          ║
║ 💡 اطلب من ${quyenhan}    ║
║ تنفيذ هذا الأمر          ║
╚══════════════════════════╝`, event.threadID, event.messageID);

    // ═══════════════════════════════════════
    // ⏱️ نظام التهدئة المطور
    // ═══════════════════════════════════════
    if (!client.cooldowns.has(command.config.name)) client.cooldowns.set(command.config.name, new Map());
    const timestamps = client.cooldowns.get(command.config.name);
    const expirationTime = (command.config.cooldowns || 1) * 1000;
    if (timestamps.has(senderID) && dateNow < timestamps.get(senderID) + expirationTime)
      return api.sendMessage(`╭─────────────⭓
│ ⏱️ الرجاء الانتظار!
│ 
│ وقت التهدئة المتبقي:
│ ${((timestamps.get(senderID) + expirationTime - dateNow)/1000).toString().slice(0, 5)} ثانية
│
│ ⚡ حاول مرة أخرى لاحقاً
╰─────────────⭓`, threadID, messageID);

    var getText2;
    if (command.languages && typeof command.languages == 'object' && command.languages.hasOwnProperty(global.config.language))
      getText2 = (...values) => {
        var lang = command.languages[global.config.language][values[0]] || '';
        for (var i = values.length; i > 0x2533 + 0x1105 + -0x3638; i--) {
          const expReg = RegExp('%' + i, 'g');
          lang = lang.replace(expReg, values[i]);
        }
        return lang;
      };
    else getText2 = () => { };

    try {
      const Obj = {};
      Obj.api = api;
      Obj.event = event;
      Obj.args = args;
      Obj.models = models;
      Obj.Users = Users;
      Obj.Threads = Threads;
      Obj.Currencies = Currencies;
      Obj.permssion = permssion;
      Obj.getText = getText2;
      usages = JSON.parse(fs.readFileSync(usgPath));
      fs.writeFileSync(usgPath, JSON.stringify(usages, null, 4));
      command.run(Obj);
      timestamps.set(senderID, dateNow);
      if (DeveloperMode == !![])
        logger(`✅ تم تنفيذ الأمر: ${commandName} | المستخدم: ${senderID} | المجموعة: ${threadID} | الوقت: ${time}`, "MODE");
      return;
    } catch (e) {
      return api.sendMessage(`╔══════════════════════════╗
║      ❌ خطأ في الأمر      ║
╠══════════════════════════╣
║ الأمر: ${commandName}              ║
║                          ║
║ 🐛 تفاصيل الخطأ:        ║
║ ${e.message.slice(0, 20)}...       ║
║                          ║
║ 📧 أبلغ المطور عن هذا الخطأ ║
╚══════════════════════════╝`, threadID);
    }
  };
};
