// Import necessary modules
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
require('dotenv').config();
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Data storage file
const PETS_FILE = 'pets.json';

// Load pets from JSON file
let pets = {};
if (fs.existsSync(PETS_FILE)) {
  try {
    pets = JSON.parse(fs.readFileSync(PETS_FILE));
  } catch (error) {
    console.error('Error reading pets data:', error);
  }
}

// Save pets to JSON file
const savePets = () => {
  try {
    fs.writeFileSync(PETS_FILE, JSON.stringify(pets, null, 2));
  } catch (error) {
    console.error('Error saving pets data:', error);
  }
};

// Helper: Format pet details
const formatPet = (pet) => `🐾 **Name:** ${pet.name}\n✨ **Level:** ${pet.level}\n🍗 **Hunger:** ${pet.hunger}\n🎒 **Items:** ${pet.items.join(', ') || 'None'}`;

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', (message) => {
  if (!message.content.startsWith('!') || message.author.bot) return;

  const [command, ...args] = message.content.slice(1).split(/\s+/);
  const userId = message.author.id;

  switch (command.toLowerCase()) {
    case 'adopt': {
      const petName = args.join(' ');
      if (!petName) return message.reply('Please specify a name for your pet!');

      if (pets[userId]) return message.reply('You already have a pet!');

      pets[userId] = { name: petName, level: 1, hunger: 0, items: [] };
      savePets();
      return message.reply(`Congratulations! You adopted a pet named **${petName}**! 🎉`);
    }

    case 'pet': {
      const pet = pets[userId];
      if (!pet) return message.reply('You don\'t have a pet yet! Use `!adopt` to adopt one.');

      return message.reply(formatPet(pet));
    }

    case 'feed': {
      const pet = pets[userId];
      if (!pet) return message.reply('You don\'t have a pet yet! Use `!adopt` to adopt one.');

      pet.hunger = Math.max(0, pet.hunger - 10);
      pet.level += 1;
      savePets();
      return message.reply(`You fed **${pet.name}**! Their hunger decreased and they leveled up! 🎉\n${formatPet(pet)}`);
    }

    case 'gift': {
      const [targetMention, ...itemArr] = args;
      const item = itemArr.join(' ');
      if (!targetMention || !item) return message.reply('Usage: `!gift @user item`');

      const targetId = targetMention.replace(/[^0-9]/g, '');
      const targetPet = pets[targetId];
      if (!targetPet) return message.reply('The mentioned user doesn\'t have a pet.');

      targetPet.items.push(item);
      savePets();
      return message.reply(`You gifted **${item}** to **${targetPet.name}**! 🎁`);
    }

    case 'contest': {
      const entries = Object.entries(pets);
      if (entries.length < 2) return message.reply('Not enough pets for a contest!');

      const winner = entries[Math.floor(Math.random() * entries.length)];
      return message.reply(`The winner of the "Cutest Pet Contest" is **${winner[1].name}**! 🎉`);
    }

    case 'battle': {
      const [opponentMention] = args;
      if (!opponentMention) return message.reply('Usage: `!battle @opponent`');

      const opponentId = opponentMention.replace(/[^0-9]/g, '');
      const userPet = pets[userId];
      const opponentPet = pets[opponentId];

      if (!userPet || !opponentPet) return message.reply('Both participants must have a pet!');

      const userScore = userPet.level + Math.random() * 10;
      const opponentScore = opponentPet.level + Math.random() * 10;

      const winner = userScore > opponentScore ? message.author.username : `<@${opponentId}>`;
      return message.reply(`The winner of the battle is **${winner}**! 🎉`);
    }

    default:
      return message.reply('Unknown command. Try `!adopt`, `!pet`, `!feed`, `!gift`, `!contest`, or `!battle`.');
  }
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);


