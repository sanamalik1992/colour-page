import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 300

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// COMPREHENSIVE COLOURING PAGE LIBRARY - 300+ PAGES
const COLOURING_PAGES = [
  // ========== DINOSAURS (20 pages) ==========
  { title: 'Cute Baby T-Rex', category: 'Dinosaurs', age: '2-6', topic: 'adorable baby tyrannosaurus rex dinosaur with big eyes smiling', tags: ['dinosaur', 't-rex', 'baby', 'cute', 'prehistoric'] },
  { title: 'Friendly Triceratops', category: 'Dinosaurs', age: '4-8', topic: 'friendly cartoon triceratops dinosaur with three horns', tags: ['dinosaur', 'triceratops', 'horns', 'prehistoric', 'cute'] },
  { title: 'Baby Stegosaurus', category: 'Dinosaurs', age: '2-6', topic: 'cute baby stegosaurus with plates on back', tags: ['dinosaur', 'stegosaurus', 'baby', 'plates', 'cute'] },
  { title: 'Dino Family Playing', category: 'Dinosaurs', age: '4-8', topic: 'dinosaur family with parent and baby dinosaurs playing together', tags: ['dinosaur', 'family', 'playing', 'cute', 'together'] },
  { title: 'Hatching Dinosaur Egg', category: 'Dinosaurs', age: '2-6', topic: 'cute baby dinosaur hatching from egg with shell pieces', tags: ['dinosaur', 'egg', 'hatching', 'baby', 'cute'] },
  { title: 'Long Neck Brachiosaurus', category: 'Dinosaurs', age: '4-8', topic: 'tall friendly brachiosaurus with long neck eating leaves', tags: ['dinosaur', 'brachiosaurus', 'tall', 'leaves', 'gentle'] },
  { title: 'Pterodactyl Flying', category: 'Dinosaurs', age: '4-8', topic: 'friendly pterodactyl flying dinosaur with wings spread', tags: ['dinosaur', 'pterodactyl', 'flying', 'wings', 'sky'] },
  { title: 'Velociraptor Playing', category: 'Dinosaurs', age: '6-10', topic: 'playful velociraptor dinosaur running and playing', tags: ['dinosaur', 'velociraptor', 'running', 'fast', 'playful'] },
  { title: 'Dinosaur Tea Party', category: 'Dinosaurs', age: '4-8', topic: 'cute dinosaurs having a tea party together', tags: ['dinosaur', 'tea party', 'cute', 'funny', 'friends'] },
  { title: 'Sleeping Baby Dino', category: 'Dinosaurs', age: '2-6', topic: 'adorable baby dinosaur sleeping curled up peacefully', tags: ['dinosaur', 'sleeping', 'baby', 'cute', 'peaceful'] },
  { title: 'Dino With Birthday Cake', category: 'Dinosaurs', age: '4-8', topic: 'happy dinosaur with birthday cake and party hat', tags: ['dinosaur', 'birthday', 'cake', 'party', 'celebration'] },
  { title: 'Ankylosaurus With Armour', category: 'Dinosaurs', age: '4-8', topic: 'friendly ankylosaurus dinosaur with armoured back and club tail', tags: ['dinosaur', 'ankylosaurus', 'armour', 'protected', 'strong'] },
  { title: 'Parasaurolophus', category: 'Dinosaurs', age: '4-8', topic: 'friendly parasaurolophus with distinctive head crest', tags: ['dinosaur', 'parasaurolophus', 'crest', 'gentle', 'herbivore'] },
  { title: 'Dinosaur In Jungle', category: 'Dinosaurs', age: '6-10', topic: 'dinosaur walking through prehistoric jungle with plants', tags: ['dinosaur', 'jungle', 'prehistoric', 'plants', 'adventure'] },
  { title: 'Two Dinos Being Friends', category: 'Dinosaurs', age: '4-8', topic: 'two different dinosaurs being best friends together', tags: ['dinosaur', 'friends', 'together', 'cute', 'friendship'] },
  { title: 'Dinosaur Eating Plants', category: 'Dinosaurs', age: '2-6', topic: 'gentle herbivore dinosaur eating leaves from plant', tags: ['dinosaur', 'eating', 'plants', 'gentle', 'herbivore'] },
  { title: 'Baby Dino With Mum', category: 'Dinosaurs', age: '2-6', topic: 'baby dinosaur with loving mother dinosaur', tags: ['dinosaur', 'baby', 'mum', 'family', 'love'] },
  { title: 'Dinosaur Footprints', category: 'Dinosaurs', age: '4-8', topic: 'dinosaur walking leaving footprints behind', tags: ['dinosaur', 'footprints', 'walking', 'tracks', 'discovery'] },
  { title: 'Spinosaurus', category: 'Dinosaurs', age: '6-10', topic: 'spinosaurus dinosaur with sail on back near water', tags: ['dinosaur', 'spinosaurus', 'sail', 'water', 'big'] },
  { title: 'Dino Alphabet Letter D', category: 'Dinosaurs', age: '2-6', topic: 'cute dinosaur with big letter D for learning alphabet', tags: ['dinosaur', 'alphabet', 'letter D', 'learning', 'educational'] },

  // ========== UNICORNS & FANTASY (25 pages) ==========
  { title: 'Magical Unicorn', category: 'Fantasy', age: '4-8', topic: 'beautiful magical unicorn with flowing mane and horn', tags: ['unicorn', 'magical', 'horse', 'fantasy', 'sparkle'] },
  { title: 'Baby Unicorn', category: 'Fantasy', age: '2-6', topic: 'adorable baby unicorn foal with small horn', tags: ['unicorn', 'baby', 'cute', 'foal', 'magical'] },
  { title: 'Unicorn With Rainbow', category: 'Fantasy', age: '4-8', topic: 'unicorn standing under beautiful rainbow', tags: ['unicorn', 'rainbow', 'magical', 'colorful', 'sky'] },
  { title: 'Flying Unicorn Pegasus', category: 'Fantasy', age: '4-8', topic: 'unicorn with wings flying through clouds', tags: ['unicorn', 'pegasus', 'wings', 'flying', 'clouds'] },
  { title: 'Unicorn In Flower Field', category: 'Fantasy', age: '4-8', topic: 'unicorn standing in beautiful field of flowers', tags: ['unicorn', 'flowers', 'field', 'nature', 'pretty'] },
  { title: 'Fairy With Wand', category: 'Fantasy', age: '4-8', topic: 'cute fairy with wings holding magic wand', tags: ['fairy', 'wings', 'wand', 'magical', 'cute'] },
  { title: 'Garden Fairy', category: 'Fantasy', age: '4-8', topic: 'fairy sitting on flower in magical garden', tags: ['fairy', 'flower', 'garden', 'magical', 'nature'] },
  { title: 'Fairy Princess', category: 'Fantasy', age: '4-8', topic: 'fairy princess with crown and sparkly dress', tags: ['fairy', 'princess', 'crown', 'dress', 'royal'] },
  { title: 'Beautiful Mermaid', category: 'Fantasy', age: '4-8', topic: 'beautiful mermaid with long hair and tail underwater', tags: ['mermaid', 'underwater', 'ocean', 'tail', 'beautiful'] },
  { title: 'Baby Mermaid', category: 'Fantasy', age: '2-6', topic: 'cute baby mermaid playing with fish', tags: ['mermaid', 'baby', 'fish', 'cute', 'ocean'] },
  { title: 'Mermaid On Rock', category: 'Fantasy', age: '4-8', topic: 'mermaid sitting on rock by the sea', tags: ['mermaid', 'rock', 'sea', 'sitting', 'pretty'] },
  { title: 'Friendly Dragon', category: 'Fantasy', age: '4-8', topic: 'cute friendly dragon with small wings smiling', tags: ['dragon', 'friendly', 'wings', 'cute', 'fantasy'] },
  { title: 'Baby Dragon Hatching', category: 'Fantasy', age: '2-6', topic: 'adorable baby dragon hatching from decorated egg', tags: ['dragon', 'baby', 'egg', 'hatching', 'cute'] },
  { title: 'Dragon With Treasure', category: 'Fantasy', age: '6-10', topic: 'friendly dragon guarding pile of treasure and gems', tags: ['dragon', 'treasure', 'gems', 'gold', 'guardian'] },
  { title: 'Princess In Castle', category: 'Fantasy', age: '4-8', topic: 'beautiful princess standing in castle tower', tags: ['princess', 'castle', 'tower', 'royal', 'beautiful'] },
  { title: 'Princess With Crown', category: 'Fantasy', age: '4-8', topic: 'princess wearing beautiful crown and ball gown', tags: ['princess', 'crown', 'dress', 'royal', 'elegant'] },
  { title: 'Fairy Tale Castle', category: 'Fantasy', age: '4-8', topic: 'magical fairy tale castle with towers and flags', tags: ['castle', 'towers', 'flags', 'magical', 'fairy tale'] },
  { title: 'Wizard With Magic Book', category: 'Fantasy', age: '6-10', topic: 'friendly wizard with hat reading magic spell book', tags: ['wizard', 'magic', 'book', 'hat', 'spells'] },
  { title: 'Cute Witch', category: 'Fantasy', age: '4-8', topic: 'cute friendly witch with pointed hat and broomstick', tags: ['witch', 'hat', 'broomstick', 'cute', 'magical'] },
  { title: 'Magic Mushroom House', category: 'Fantasy', age: '4-8', topic: 'magical mushroom house in enchanted forest', tags: ['mushroom', 'house', 'forest', 'magical', 'fairy'] },
  { title: 'Enchanted Forest', category: 'Fantasy', age: '6-10', topic: 'magical enchanted forest with glowing trees and path', tags: ['forest', 'enchanted', 'trees', 'magical', 'nature'] },
  { title: 'Phoenix Bird', category: 'Fantasy', age: '6-10', topic: 'beautiful phoenix bird with spread wings and feathers', tags: ['phoenix', 'bird', 'wings', 'feathers', 'magical'] },
  { title: 'Unicorn And Princess', category: 'Fantasy', age: '4-8', topic: 'princess with her unicorn friend together', tags: ['unicorn', 'princess', 'friends', 'magical', 'together'] },
  { title: 'Fairy Ring Mushrooms', category: 'Fantasy', age: '4-8', topic: 'circle of magical mushrooms with tiny fairy', tags: ['fairy', 'mushrooms', 'ring', 'magical', 'tiny'] },
  { title: 'Crystal Cave', category: 'Fantasy', age: '6-10', topic: 'magical cave filled with crystals and gems', tags: ['cave', 'crystals', 'gems', 'magical', 'sparkle'] },

  // ========== ANIMALS - PETS (25 pages) ==========
  { title: 'Playful Puppy', category: 'Animals', age: '2-6', topic: 'cute playful puppy dog with wagging tail', tags: ['puppy', 'dog', 'pet', 'cute', 'playful'] },
  { title: 'Puppy With Ball', category: 'Animals', age: '2-6', topic: 'happy puppy playing with bouncy ball', tags: ['puppy', 'ball', 'playing', 'happy', 'pet'] },
  { title: 'Sleeping Puppy', category: 'Animals', age: '2-6', topic: 'adorable puppy sleeping in cozy dog bed', tags: ['puppy', 'sleeping', 'bed', 'cute', 'peaceful'] },
  { title: 'Puppy With Bone', category: 'Animals', age: '2-6', topic: 'happy puppy holding bone in mouth', tags: ['puppy', 'bone', 'happy', 'pet', 'dog'] },
  { title: 'Fluffy Kitten', category: 'Animals', age: '2-6', topic: 'adorable fluffy kitten with big eyes', tags: ['kitten', 'cat', 'fluffy', 'cute', 'pet'] },
  { title: 'Kitten With Yarn', category: 'Animals', age: '2-6', topic: 'playful kitten playing with ball of yarn', tags: ['kitten', 'yarn', 'playing', 'cute', 'pet'] },
  { title: 'Sleeping Kitten', category: 'Animals', age: '2-6', topic: 'sweet kitten curled up sleeping peacefully', tags: ['kitten', 'sleeping', 'cute', 'peaceful', 'cat'] },
  { title: 'Cat And Kitten', category: 'Animals', age: '2-6', topic: 'mother cat with baby kitten together', tags: ['cat', 'kitten', 'family', 'mother', 'baby'] },
  { title: 'Bunny Rabbit', category: 'Animals', age: '2-6', topic: 'cute fluffy bunny rabbit with long ears', tags: ['bunny', 'rabbit', 'fluffy', 'ears', 'cute'] },
  { title: 'Bunny With Carrot', category: 'Animals', age: '2-6', topic: 'happy bunny rabbit eating orange carrot', tags: ['bunny', 'carrot', 'eating', 'rabbit', 'cute'] },
  { title: 'Hamster In Wheel', category: 'Animals', age: '4-8', topic: 'cute hamster running in exercise wheel', tags: ['hamster', 'wheel', 'running', 'pet', 'cute'] },
  { title: 'Guinea Pig', category: 'Animals', age: '4-8', topic: 'fluffy guinea pig eating lettuce leaf', tags: ['guinea pig', 'fluffy', 'pet', 'eating', 'cute'] },
  { title: 'Goldfish In Bowl', category: 'Animals', age: '2-6', topic: 'pretty goldfish swimming in round bowl', tags: ['goldfish', 'fish', 'bowl', 'swimming', 'pet'] },
  { title: 'Parrot On Perch', category: 'Animals', age: '4-8', topic: 'colorful parrot sitting on wooden perch', tags: ['parrot', 'bird', 'perch', 'pet', 'colorful'] },
  { title: 'Turtle Pet', category: 'Animals', age: '4-8', topic: 'cute pet turtle with patterned shell', tags: ['turtle', 'shell', 'pet', 'slow', 'cute'] },
  { title: 'Dog Family', category: 'Animals', age: '4-8', topic: 'dog family with puppies playing together', tags: ['dog', 'family', 'puppies', 'playing', 'together'] },
  { title: 'Cat Family', category: 'Animals', age: '4-8', topic: 'cat family with kittens cuddling', tags: ['cat', 'family', 'kittens', 'cuddling', 'love'] },
  { title: 'Puppy Bath Time', category: 'Animals', age: '2-6', topic: 'puppy in bathtub with bubbles and rubber duck', tags: ['puppy', 'bath', 'bubbles', 'duck', 'clean'] },
  { title: 'Dog With Leash', category: 'Animals', age: '4-8', topic: 'happy dog ready for walk with leash', tags: ['dog', 'leash', 'walk', 'happy', 'exercise'] },
  { title: 'Cat In Box', category: 'Animals', age: '2-6', topic: 'funny cat sitting inside cardboard box', tags: ['cat', 'box', 'funny', 'sitting', 'cute'] },
  { title: 'Puppy And Kitten Friends', category: 'Animals', age: '2-6', topic: 'puppy and kitten being best friends together', tags: ['puppy', 'kitten', 'friends', 'together', 'cute'] },
  { title: 'Dog House', category: 'Animals', age: '4-8', topic: 'happy dog sitting by colorful dog house', tags: ['dog', 'house', 'home', 'happy', 'pet'] },
  { title: 'Cat On Cushion', category: 'Animals', age: '2-6', topic: 'relaxed cat lying on soft cushion', tags: ['cat', 'cushion', 'relaxed', 'comfy', 'pet'] },
  { title: 'Poodle Dog', category: 'Animals', age: '4-8', topic: 'fancy poodle dog with fluffy fur', tags: ['poodle', 'dog', 'fluffy', 'fancy', 'pet'] },
  { title: 'Dalmatian Puppy', category: 'Animals', age: '4-8', topic: 'dalmatian puppy with spots pattern', tags: ['dalmatian', 'puppy', 'spots', 'dog', 'cute'] },

  // ========== FARM ANIMALS (20 pages) ==========
  { title: 'Friendly Cow', category: 'Animals', age: '2-6', topic: 'friendly cow with spots in farm field', tags: ['cow', 'farm', 'spots', 'milk', 'friendly'] },
  { title: 'Baby Calf', category: 'Animals', age: '2-6', topic: 'cute baby calf with mother cow', tags: ['calf', 'cow', 'baby', 'mother', 'farm'] },
  { title: 'Woolly Sheep', category: 'Animals', age: '2-6', topic: 'fluffy woolly sheep in green meadow', tags: ['sheep', 'wool', 'fluffy', 'farm', 'meadow'] },
  { title: 'Baby Lamb', category: 'Animals', age: '2-6', topic: 'adorable baby lamb with fluffy wool', tags: ['lamb', 'baby', 'sheep', 'fluffy', 'cute'] },
  { title: 'Pink Pig', category: 'Animals', age: '2-6', topic: 'happy pink pig with curly tail', tags: ['pig', 'pink', 'curly tail', 'farm', 'happy'] },
  { title: 'Piglets Playing', category: 'Animals', age: '2-6', topic: 'cute piglets playing in mud together', tags: ['piglets', 'playing', 'mud', 'farm', 'fun'] },
  { title: 'Rooster Crowing', category: 'Animals', age: '4-8', topic: 'proud rooster crowing at sunrise', tags: ['rooster', 'crowing', 'morning', 'farm', 'bird'] },
  { title: 'Hen With Chicks', category: 'Animals', age: '2-6', topic: 'mother hen with baby chicks following', tags: ['hen', 'chicks', 'mother', 'baby', 'farm'] },
  { title: 'Baby Chicks', category: 'Animals', age: '2-6', topic: 'adorable fluffy yellow baby chicks', tags: ['chicks', 'baby', 'yellow', 'fluffy', 'cute'] },
  { title: 'Horse In Field', category: 'Animals', age: '4-8', topic: 'beautiful horse running in open field', tags: ['horse', 'running', 'field', 'farm', 'beautiful'] },
  { title: 'Baby Foal', category: 'Animals', age: '2-6', topic: 'cute baby foal with long legs', tags: ['foal', 'horse', 'baby', 'legs', 'cute'] },
  { title: 'Pony With Bow', category: 'Animals', age: '4-8', topic: 'pretty pony with bow in mane', tags: ['pony', 'horse', 'bow', 'pretty', 'cute'] },
  { title: 'Donkey', category: 'Animals', age: '4-8', topic: 'friendly donkey with long ears', tags: ['donkey', 'ears', 'farm', 'friendly', 'animal'] },
  { title: 'Goat On Hill', category: 'Animals', age: '4-8', topic: 'playful goat standing on small hill', tags: ['goat', 'hill', 'farm', 'playful', 'animal'] },
  { title: 'Baby Goat Kid', category: 'Animals', age: '2-6', topic: 'cute baby goat kid jumping', tags: ['goat', 'kid', 'baby', 'jumping', 'cute'] },
  { title: 'Duck Family', category: 'Animals', age: '2-6', topic: 'mother duck with ducklings in row', tags: ['duck', 'ducklings', 'family', 'row', 'water'] },
  { title: 'Turkey', category: 'Animals', age: '4-8', topic: 'turkey with colorful tail feathers spread', tags: ['turkey', 'feathers', 'tail', 'farm', 'bird'] },
  { title: 'Barn With Animals', category: 'Animals', age: '4-8', topic: 'red barn with various farm animals around', tags: ['barn', 'farm', 'animals', 'red', 'country'] },
  { title: 'Tractor On Farm', category: 'Vehicles', age: '4-8', topic: 'farmer driving tractor on farm', tags: ['tractor', 'farm', 'farmer', 'vehicle', 'country'] },
  { title: 'Scarecrow', category: 'Animals', age: '4-8', topic: 'friendly scarecrow in vegetable garden', tags: ['scarecrow', 'garden', 'farm', 'friendly', 'vegetables'] },

  // ========== WILD ANIMALS (25 pages) ==========
  { title: 'Lion King', category: 'Animals', age: '4-8', topic: 'majestic lion with big mane', tags: ['lion', 'mane', 'king', 'jungle', 'wild'] },
  { title: 'Baby Lion Cub', category: 'Animals', age: '2-6', topic: 'cute baby lion cub playing', tags: ['lion', 'cub', 'baby', 'playing', 'cute'] },
  { title: 'Elephant Family', category: 'Animals', age: '4-8', topic: 'elephant family with baby elephant', tags: ['elephant', 'family', 'baby', 'trunk', 'big'] },
  { title: 'Baby Elephant', category: 'Animals', age: '2-6', topic: 'adorable baby elephant with trunk up', tags: ['elephant', 'baby', 'trunk', 'cute', 'big'] },
  { title: 'Tall Giraffe', category: 'Animals', age: '4-8', topic: 'tall giraffe with spotted pattern', tags: ['giraffe', 'tall', 'spots', 'neck', 'safari'] },
  { title: 'Baby Giraffe', category: 'Animals', age: '2-6', topic: 'cute baby giraffe with long neck', tags: ['giraffe', 'baby', 'cute', 'tall', 'spots'] },
  { title: 'Zebra With Stripes', category: 'Animals', age: '4-8', topic: 'zebra with black and white stripes', tags: ['zebra', 'stripes', 'black', 'white', 'safari'] },
  { title: 'Hippo In Water', category: 'Animals', age: '4-8', topic: 'hippo peeking out of water', tags: ['hippo', 'water', 'river', 'big', 'africa'] },
  { title: 'Rhino', category: 'Animals', age: '4-8', topic: 'rhinoceros with horn on nose', tags: ['rhino', 'horn', 'big', 'strong', 'safari'] },
  { title: 'Monkey Swinging', category: 'Animals', age: '4-8', topic: 'playful monkey swinging from vine', tags: ['monkey', 'swinging', 'vine', 'jungle', 'playful'] },
  { title: 'Baby Monkey', category: 'Animals', age: '2-6', topic: 'cute baby monkey with banana', tags: ['monkey', 'baby', 'banana', 'cute', 'jungle'] },
  { title: 'Gorilla', category: 'Animals', age: '6-10', topic: 'strong gorilla sitting in jungle', tags: ['gorilla', 'strong', 'jungle', 'ape', 'big'] },
  { title: 'Panda Bear', category: 'Animals', age: '2-6', topic: 'cute panda bear eating bamboo', tags: ['panda', 'bear', 'bamboo', 'cute', 'black white'] },
  { title: 'Baby Panda', category: 'Animals', age: '2-6', topic: 'adorable baby panda rolling', tags: ['panda', 'baby', 'cute', 'rolling', 'fluffy'] },
  { title: 'Koala On Tree', category: 'Animals', age: '2-6', topic: 'sleepy koala hugging tree branch', tags: ['koala', 'tree', 'australia', 'sleepy', 'cute'] },
  { title: 'Kangaroo With Joey', category: 'Animals', age: '4-8', topic: 'kangaroo with baby joey in pouch', tags: ['kangaroo', 'joey', 'pouch', 'australia', 'hopping'] },
  { title: 'Tiger', category: 'Animals', age: '4-8', topic: 'beautiful tiger with stripes', tags: ['tiger', 'stripes', 'big cat', 'wild', 'orange'] },
  { title: 'Baby Tiger Cub', category: 'Animals', age: '2-6', topic: 'cute baby tiger cub playing', tags: ['tiger', 'cub', 'baby', 'cute', 'stripes'] },
  { title: 'Cheetah Running', category: 'Animals', age: '6-10', topic: 'fast cheetah running with spots', tags: ['cheetah', 'running', 'fast', 'spots', 'safari'] },
  { title: 'Leopard', category: 'Animals', age: '6-10', topic: 'leopard resting on tree branch', tags: ['leopard', 'spots', 'tree', 'wild', 'cat'] },
  { title: 'Wolf', category: 'Animals', age: '6-10', topic: 'wolf howling at moon', tags: ['wolf', 'howling', 'moon', 'wild', 'night'] },
  { title: 'Fox', category: 'Animals', age: '4-8', topic: 'cute red fox with bushy tail', tags: ['fox', 'red', 'tail', 'bushy', 'wild'] },
  { title: 'Bear In Forest', category: 'Animals', age: '4-8', topic: 'friendly bear in forest setting', tags: ['bear', 'forest', 'big', 'wild', 'friendly'] },
  { title: 'Baby Bear Cub', category: 'Animals', age: '2-6', topic: 'cute baby bear cub with honey', tags: ['bear', 'cub', 'baby', 'honey', 'cute'] },
  { title: 'Deer In Woods', category: 'Animals', age: '4-8', topic: 'graceful deer with antlers in woods', tags: ['deer', 'antlers', 'woods', 'graceful', 'forest'] },

  // ========== OCEAN ANIMALS (20 pages) ==========
  { title: 'Friendly Dolphin', category: 'Ocean', age: '4-8', topic: 'friendly dolphin jumping out of water', tags: ['dolphin', 'jumping', 'ocean', 'water', 'friendly'] },
  { title: 'Baby Dolphin', category: 'Ocean', age: '2-6', topic: 'cute baby dolphin swimming with mother', tags: ['dolphin', 'baby', 'swimming', 'ocean', 'family'] },
  { title: 'Whale', category: 'Ocean', age: '4-8', topic: 'big friendly whale spouting water', tags: ['whale', 'big', 'spout', 'ocean', 'blue'] },
  { title: 'Baby Whale', category: 'Ocean', age: '2-6', topic: 'cute baby whale swimming', tags: ['whale', 'baby', 'cute', 'swimming', 'ocean'] },
  { title: 'Shark Smiling', category: 'Ocean', age: '4-8', topic: 'friendly cartoon shark with big smile', tags: ['shark', 'smiling', 'friendly', 'ocean', 'teeth'] },
  { title: 'Baby Shark', category: 'Ocean', age: '2-6', topic: 'cute baby shark swimming happily', tags: ['baby shark', 'cute', 'swimming', 'ocean', 'happy'] },
  { title: 'Octopus', category: 'Ocean', age: '4-8', topic: 'friendly octopus with eight tentacles', tags: ['octopus', 'tentacles', 'eight', 'ocean', 'friendly'] },
  { title: 'Baby Octopus', category: 'Ocean', age: '2-6', topic: 'adorable baby octopus waving', tags: ['octopus', 'baby', 'cute', 'waving', 'ocean'] },
  { title: 'Sea Turtle', category: 'Ocean', age: '4-8', topic: 'sea turtle swimming through ocean', tags: ['turtle', 'sea', 'swimming', 'shell', 'ocean'] },
  { title: 'Jellyfish', category: 'Ocean', age: '4-8', topic: 'pretty jellyfish floating in sea', tags: ['jellyfish', 'floating', 'ocean', 'pretty', 'tentacles'] },
  { title: 'Starfish', category: 'Ocean', age: '2-6', topic: 'cute starfish on sandy beach', tags: ['starfish', 'beach', 'sand', 'ocean', 'five'] },
  { title: 'Seahorse', category: 'Ocean', age: '4-8', topic: 'pretty seahorse swimming in coral', tags: ['seahorse', 'coral', 'ocean', 'pretty', 'swimming'] },
  { title: 'Clownfish', category: 'Ocean', age: '4-8', topic: 'clownfish swimming near anemone', tags: ['clownfish', 'anemone', 'orange', 'ocean', 'nemo'] },
  { title: 'Crab On Beach', category: 'Ocean', age: '4-8', topic: 'funny crab with big claws on beach', tags: ['crab', 'claws', 'beach', 'sand', 'funny'] },
  { title: 'Lobster', category: 'Ocean', age: '4-8', topic: 'lobster with big claws', tags: ['lobster', 'claws', 'ocean', 'red', 'sea'] },
  { title: 'Coral Reef Scene', category: 'Ocean', age: '6-10', topic: 'colorful coral reef with fish swimming', tags: ['coral', 'reef', 'fish', 'ocean', 'underwater'] },
  { title: 'Penguin', category: 'Ocean', age: '2-6', topic: 'cute penguin standing on ice', tags: ['penguin', 'ice', 'cold', 'bird', 'cute'] },
  { title: 'Baby Penguin', category: 'Ocean', age: '2-6', topic: 'fluffy baby penguin chick', tags: ['penguin', 'baby', 'fluffy', 'chick', 'cute'] },
  { title: 'Seal', category: 'Ocean', age: '4-8', topic: 'playful seal on rocks by sea', tags: ['seal', 'rocks', 'sea', 'playful', 'ocean'] },
  { title: 'Walrus', category: 'Ocean', age: '4-8', topic: 'walrus with big tusks', tags: ['walrus', 'tusks', 'arctic', 'big', 'ocean'] },

  // ========== VEHICLES (30 pages) ==========
  { title: 'Fire Truck', category: 'Vehicles', age: '2-6', topic: 'red fire truck with ladder and hose', tags: ['fire truck', 'red', 'ladder', 'emergency', 'firefighter'] },
  { title: 'Fire Engine Rescue', category: 'Vehicles', age: '4-8', topic: 'fire engine with firefighters ready', tags: ['fire engine', 'firefighters', 'rescue', 'emergency', 'heroes'] },
  { title: 'Police Car', category: 'Vehicles', age: '2-6', topic: 'police car with lights on top', tags: ['police', 'car', 'lights', 'siren', 'emergency'] },
  { title: 'Ambulance', category: 'Vehicles', age: '4-8', topic: 'ambulance with red cross symbol', tags: ['ambulance', 'medical', 'emergency', 'hospital', 'help'] },
  { title: 'School Bus', category: 'Vehicles', age: '2-6', topic: 'yellow school bus with children', tags: ['bus', 'school', 'yellow', 'children', 'transport'] },
  { title: 'Double Decker Bus', category: 'Vehicles', age: '4-8', topic: 'red double decker London bus', tags: ['bus', 'double decker', 'red', 'London', 'transport'] },
  { title: 'Racing Car', category: 'Vehicles', age: '4-8', topic: 'fast racing car with number', tags: ['racing', 'car', 'fast', 'number', 'speed'] },
  { title: 'Monster Truck', category: 'Vehicles', age: '4-8', topic: 'big monster truck with huge wheels', tags: ['monster truck', 'big wheels', 'powerful', 'truck', 'cool'] },
  { title: 'Excavator Digger', category: 'Vehicles', age: '2-6', topic: 'yellow excavator digger at construction', tags: ['excavator', 'digger', 'construction', 'yellow', 'building'] },
  { title: 'Dump Truck', category: 'Vehicles', age: '2-6', topic: 'dump truck carrying load of dirt', tags: ['dump truck', 'construction', 'dirt', 'carrying', 'big'] },
  { title: 'Cement Mixer', category: 'Vehicles', age: '4-8', topic: 'cement mixer truck spinning drum', tags: ['cement', 'mixer', 'construction', 'spinning', 'building'] },
  { title: 'Bulldozer', category: 'Vehicles', age: '4-8', topic: 'powerful bulldozer pushing dirt', tags: ['bulldozer', 'pushing', 'construction', 'powerful', 'yellow'] },
  { title: 'Crane', category: 'Vehicles', age: '4-8', topic: 'tall crane lifting heavy load', tags: ['crane', 'lifting', 'tall', 'construction', 'building'] },
  { title: 'Steam Train', category: 'Vehicles', age: '4-8', topic: 'old steam train with carriages', tags: ['train', 'steam', 'carriages', 'railway', 'choo choo'] },
  { title: 'Modern Train', category: 'Vehicles', age: '4-8', topic: 'fast modern passenger train', tags: ['train', 'modern', 'fast', 'passenger', 'railway'] },
  { title: 'Aeroplane', category: 'Vehicles', age: '4-8', topic: 'aeroplane flying through clouds', tags: ['aeroplane', 'flying', 'clouds', 'sky', 'travel'] },
  { title: 'Helicopter', category: 'Vehicles', age: '4-8', topic: 'helicopter with spinning blades', tags: ['helicopter', 'blades', 'flying', 'rescue', 'sky'] },
  { title: 'Hot Air Balloon', category: 'Vehicles', age: '4-8', topic: 'colorful hot air balloon in sky', tags: ['balloon', 'hot air', 'sky', 'flying', 'colorful'] },
  { title: 'Rocket Ship', category: 'Space', age: '4-8', topic: 'rocket ship blasting off into space', tags: ['rocket', 'space', 'blast off', 'stars', 'launch'] },
  { title: 'Spaceship', category: 'Space', age: '4-8', topic: 'cool spaceship flying through stars', tags: ['spaceship', 'space', 'stars', 'flying', 'sci-fi'] },
  { title: 'Sailing Boat', category: 'Vehicles', age: '4-8', topic: 'sailing boat on calm ocean', tags: ['boat', 'sailing', 'ocean', 'water', 'wind'] },
  { title: 'Pirate Ship', category: 'Vehicles', age: '4-8', topic: 'pirate ship with skull flag', tags: ['pirate', 'ship', 'skull', 'flag', 'adventure'] },
  { title: 'Submarine', category: 'Vehicles', age: '4-8', topic: 'submarine underwater with periscope', tags: ['submarine', 'underwater', 'ocean', 'periscope', 'deep'] },
  { title: 'Bicycle', category: 'Vehicles', age: '4-8', topic: 'bicycle with basket and bell', tags: ['bicycle', 'basket', 'bell', 'riding', 'wheels'] },
  { title: 'Motorcycle', category: 'Vehicles', age: '6-10', topic: 'cool motorcycle with rider', tags: ['motorcycle', 'rider', 'fast', 'wheels', 'cool'] },
  { title: 'Scooter', category: 'Vehicles', age: '4-8', topic: 'kick scooter for child', tags: ['scooter', 'kick', 'riding', 'fun', 'wheels'] },
  { title: 'Ice Cream Truck', category: 'Vehicles', age: '2-6', topic: 'ice cream truck with treats', tags: ['ice cream', 'truck', 'treats', 'summer', 'yummy'] },
  { title: 'Tow Truck', category: 'Vehicles', age: '4-8', topic: 'tow truck helping broken car', tags: ['tow truck', 'helping', 'rescue', 'car', 'service'] },
  { title: 'Garbage Truck', category: 'Vehicles', age: '4-8', topic: 'garbage truck collecting rubbish', tags: ['garbage', 'truck', 'collecting', 'rubbish', 'helper'] },
  { title: 'Delivery Van', category: 'Vehicles', age: '4-8', topic: 'delivery van with packages', tags: ['delivery', 'van', 'packages', 'parcels', 'service'] },

  // ========== SPACE (20 pages) ==========
  { title: 'Astronaut', category: 'Space', age: '4-8', topic: 'astronaut in spacesuit floating in space', tags: ['astronaut', 'space', 'spacesuit', 'floating', 'stars'] },
  { title: 'Astronaut On Moon', category: 'Space', age: '4-8', topic: 'astronaut standing on moon surface', tags: ['astronaut', 'moon', 'space', 'flag', 'landing'] },
  { title: 'Rocket Launch', category: 'Space', age: '4-8', topic: 'rocket launching with fire and smoke', tags: ['rocket', 'launch', 'fire', 'smoke', 'space'] },
  { title: 'Planet Earth', category: 'Space', age: '4-8', topic: 'planet Earth from space showing continents', tags: ['earth', 'planet', 'space', 'continents', 'home'] },
  { title: 'Solar System', category: 'Space', age: '6-10', topic: 'solar system with sun and planets orbiting', tags: ['solar system', 'planets', 'sun', 'orbiting', 'space'] },
  { title: 'Moon And Stars', category: 'Space', age: '2-6', topic: 'crescent moon surrounded by twinkling stars', tags: ['moon', 'stars', 'night', 'sky', 'twinkle'] },
  { title: 'Saturn Planet', category: 'Space', age: '4-8', topic: 'planet Saturn with beautiful rings', tags: ['Saturn', 'planet', 'rings', 'space', 'gas giant'] },
  { title: 'Alien Friend', category: 'Space', age: '4-8', topic: 'cute friendly alien waving hello', tags: ['alien', 'friendly', 'waving', 'space', 'cute'] },
  { title: 'UFO Spaceship', category: 'Space', age: '4-8', topic: 'flying saucer UFO with lights', tags: ['UFO', 'flying saucer', 'lights', 'alien', 'space'] },
  { title: 'Space Station', category: 'Space', age: '6-10', topic: 'space station orbiting Earth', tags: ['space station', 'orbiting', 'Earth', 'astronaut', 'science'] },
  { title: 'Comet', category: 'Space', age: '6-10', topic: 'comet with long tail in space', tags: ['comet', 'tail', 'space', 'shooting star', 'flying'] },
  { title: 'Telescope', category: 'Space', age: '4-8', topic: 'child looking through telescope at stars', tags: ['telescope', 'stars', 'looking', 'night', 'astronomy'] },
  { title: 'Robot', category: 'Space', age: '4-8', topic: 'friendly robot helper with buttons', tags: ['robot', 'friendly', 'buttons', 'helper', 'technology'] },
  { title: 'Robot Dancing', category: 'Space', age: '4-8', topic: 'cute robot doing happy dance', tags: ['robot', 'dancing', 'happy', 'cute', 'fun'] },
  { title: 'Mars Rover', category: 'Space', age: '6-10', topic: 'Mars rover exploring red planet', tags: ['Mars', 'rover', 'exploring', 'planet', 'robot'] },
  { title: 'Astronaut Dog', category: 'Space', age: '4-8', topic: 'dog wearing astronaut helmet in space', tags: ['dog', 'astronaut', 'space', 'helmet', 'funny'] },
  { title: 'Star Constellation', category: 'Space', age: '6-10', topic: 'star constellation pattern in night sky', tags: ['stars', 'constellation', 'pattern', 'night', 'astronomy'] },
  { title: 'Shooting Star', category: 'Space', age: '4-8', topic: 'shooting star streaking across sky', tags: ['shooting star', 'meteor', 'wish', 'night', 'sky'] },
  { title: 'Sun Smiling', category: 'Space', age: '2-6', topic: 'happy smiling sun with rays', tags: ['sun', 'smiling', 'happy', 'rays', 'bright'] },
  { title: 'Milky Way', category: 'Space', age: '6-10', topic: 'milky way galaxy spiral view', tags: ['milky way', 'galaxy', 'spiral', 'space', 'stars'] },

  // ========== HOLIDAYS - CHRISTMAS (15 pages) ==========
  { title: 'Christmas Tree', category: 'Seasonal', age: '2-6', topic: 'decorated Christmas tree with star on top', tags: ['Christmas', 'tree', 'star', 'decorations', 'festive'] },
  { title: 'Santa Claus', category: 'Seasonal', age: '2-6', topic: 'jolly Santa Claus with beard and hat', tags: ['Santa', 'Christmas', 'beard', 'hat', 'jolly'] },
  { title: 'Santa Sleigh', category: 'Seasonal', age: '4-8', topic: 'Santa in sleigh with reindeer flying', tags: ['Santa', 'sleigh', 'reindeer', 'flying', 'Christmas'] },
  { title: 'Reindeer', category: 'Seasonal', age: '4-8', topic: 'cute reindeer with red nose', tags: ['reindeer', 'red nose', 'Christmas', 'Rudolph', 'cute'] },
  { title: 'Snowman', category: 'Seasonal', age: '2-6', topic: 'friendly snowman with hat and scarf', tags: ['snowman', 'hat', 'scarf', 'winter', 'Christmas'] },
  { title: 'Christmas Stocking', category: 'Seasonal', age: '2-6', topic: 'Christmas stocking filled with presents', tags: ['stocking', 'presents', 'Christmas', 'gifts', 'hanging'] },
  { title: 'Christmas Presents', category: 'Seasonal', age: '2-6', topic: 'pile of wrapped Christmas presents', tags: ['presents', 'wrapped', 'gifts', 'Christmas', 'bows'] },
  { title: 'Gingerbread Man', category: 'Seasonal', age: '2-6', topic: 'decorated gingerbread man cookie', tags: ['gingerbread', 'cookie', 'Christmas', 'decorated', 'sweet'] },
  { title: 'Gingerbread House', category: 'Seasonal', age: '4-8', topic: 'decorated gingerbread house with candy', tags: ['gingerbread', 'house', 'candy', 'Christmas', 'sweet'] },
  { title: 'Christmas Wreath', category: 'Seasonal', age: '4-8', topic: 'Christmas wreath with bow and holly', tags: ['wreath', 'bow', 'holly', 'Christmas', 'door'] },
  { title: 'Christmas Elf', category: 'Seasonal', age: '4-8', topic: 'cute Christmas elf making toys', tags: ['elf', 'Christmas', 'toys', 'cute', 'helper'] },
  { title: 'Angel', category: 'Seasonal', age: '4-8', topic: 'beautiful Christmas angel with wings', tags: ['angel', 'wings', 'Christmas', 'beautiful', 'heaven'] },
  { title: 'Christmas Bells', category: 'Seasonal', age: '4-8', topic: 'Christmas bells with ribbon', tags: ['bells', 'ribbon', 'Christmas', 'ringing', 'festive'] },
  { title: 'Christmas Candle', category: 'Seasonal', age: '4-8', topic: 'Christmas candle with holly decoration', tags: ['candle', 'holly', 'Christmas', 'flame', 'warm'] },
  { title: 'Snow Globe', category: 'Seasonal', age: '4-8', topic: 'Christmas snow globe with scene inside', tags: ['snow globe', 'Christmas', 'snow', 'scene', 'magical'] },

  // ========== HOLIDAYS - HALLOWEEN (10 pages) ==========
  { title: 'Jack O Lantern', category: 'Seasonal', age: '4-8', topic: 'carved pumpkin jack o lantern with face', tags: ['pumpkin', 'Halloween', 'carved', 'face', 'spooky'] },
  { title: 'Friendly Ghost', category: 'Seasonal', age: '2-6', topic: 'cute friendly ghost saying boo', tags: ['ghost', 'Halloween', 'friendly', 'boo', 'cute'] },
  { title: 'Halloween Bat', category: 'Seasonal', age: '4-8', topic: 'cute bat with spread wings', tags: ['bat', 'Halloween', 'wings', 'night', 'flying'] },
  { title: 'Black Cat', category: 'Seasonal', age: '4-8', topic: 'Halloween black cat with arched back', tags: ['cat', 'black', 'Halloween', 'spooky', 'witch'] },
  { title: 'Witch Hat', category: 'Seasonal', age: '4-8', topic: 'pointy witch hat with buckle', tags: ['witch', 'hat', 'Halloween', 'pointy', 'magic'] },
  { title: 'Haunted House', category: 'Seasonal', age: '6-10', topic: 'spooky haunted house with moon', tags: ['haunted', 'house', 'Halloween', 'spooky', 'moon'] },
  { title: 'Spider Web', category: 'Seasonal', age: '4-8', topic: 'spider in decorative web', tags: ['spider', 'web', 'Halloween', 'creepy', 'cute'] },
  { title: 'Mummy', category: 'Seasonal', age: '4-8', topic: 'cute wrapped mummy monster', tags: ['mummy', 'Halloween', 'wrapped', 'cute', 'monster'] },
  { title: 'Vampire', category: 'Seasonal', age: '6-10', topic: 'friendly vampire with cape', tags: ['vampire', 'cape', 'Halloween', 'fangs', 'friendly'] },
  { title: 'Skeleton', category: 'Seasonal', age: '6-10', topic: 'dancing skeleton with bones', tags: ['skeleton', 'bones', 'Halloween', 'dancing', 'spooky'] },

  // ========== HOLIDAYS - EASTER (10 pages) ==========
  { title: 'Easter Bunny', category: 'Seasonal', age: '2-6', topic: 'cute Easter bunny with basket of eggs', tags: ['Easter', 'bunny', 'basket', 'eggs', 'spring'] },
  { title: 'Easter Egg Decorated', category: 'Seasonal', age: '2-6', topic: 'beautifully decorated Easter egg with patterns', tags: ['Easter', 'egg', 'decorated', 'patterns', 'colorful'] },
  { title: 'Easter Basket', category: 'Seasonal', age: '2-6', topic: 'Easter basket full of eggs and treats', tags: ['Easter', 'basket', 'eggs', 'treats', 'spring'] },
  { title: 'Easter Chick', category: 'Seasonal', age: '2-6', topic: 'cute Easter chick hatching from egg', tags: ['Easter', 'chick', 'hatching', 'egg', 'cute'] },
  { title: 'Easter Lamb', category: 'Seasonal', age: '2-6', topic: 'sweet Easter lamb with bow', tags: ['Easter', 'lamb', 'bow', 'spring', 'cute'] },
  { title: 'Spring Flowers', category: 'Seasonal', age: '4-8', topic: 'spring flowers blooming for Easter', tags: ['spring', 'flowers', 'Easter', 'blooming', 'pretty'] },
  { title: 'Easter Egg Hunt', category: 'Seasonal', age: '4-8', topic: 'child finding Easter eggs in garden', tags: ['Easter', 'egg hunt', 'garden', 'finding', 'fun'] },
  { title: 'Easter Bonnet', category: 'Seasonal', age: '4-8', topic: 'decorated Easter bonnet hat with flowers', tags: ['Easter', 'bonnet', 'hat', 'flowers', 'parade'] },
  { title: 'Easter Cross', category: 'Seasonal', age: '4-8', topic: 'Easter cross with flowers and sun', tags: ['Easter', 'cross', 'flowers', 'sun', 'religious'] },
  { title: 'Bunny Family', category: 'Seasonal', age: '2-6', topic: 'bunny family celebrating Easter together', tags: ['bunny', 'family', 'Easter', 'together', 'cute'] },

  // ========== PEOPLE & DAILY LIFE (20 pages) ==========
  { title: 'Happy Family', category: 'People', age: '4-8', topic: 'happy family with parents and children', tags: ['family', 'happy', 'parents', 'children', 'love'] },
  { title: 'Boy Playing', category: 'People', age: '2-6', topic: 'boy playing with toys happily', tags: ['boy', 'playing', 'toys', 'happy', 'child'] },
  { title: 'Girl Playing', category: 'People', age: '2-6', topic: 'girl playing with dolls happily', tags: ['girl', 'playing', 'dolls', 'happy', 'child'] },
  { title: 'Kids At School', category: 'People', age: '4-8', topic: 'children learning in classroom at school', tags: ['school', 'classroom', 'learning', 'children', 'education'] },
  { title: 'Birthday Party', category: 'People', age: '4-8', topic: 'child birthday party with cake and balloons', tags: ['birthday', 'party', 'cake', 'balloons', 'celebration'] },
  { title: 'Kids Playing Sports', category: 'People', age: '4-8', topic: 'children playing football together', tags: ['sports', 'football', 'playing', 'children', 'active'] },
  { title: 'Doctor', category: 'People', age: '4-8', topic: 'friendly doctor with stethoscope', tags: ['doctor', 'medical', 'stethoscope', 'helper', 'health'] },
  { title: 'Firefighter', category: 'People', age: '4-8', topic: 'brave firefighter in uniform with helmet', tags: ['firefighter', 'uniform', 'helmet', 'brave', 'hero'] },
  { title: 'Police Officer', category: 'People', age: '4-8', topic: 'friendly police officer in uniform', tags: ['police', 'officer', 'uniform', 'helper', 'safety'] },
  { title: 'Teacher', category: 'People', age: '4-8', topic: 'kind teacher at blackboard in classroom', tags: ['teacher', 'classroom', 'blackboard', 'learning', 'kind'] },
  { title: 'Chef Cooking', category: 'People', age: '4-8', topic: 'chef cooking in kitchen with hat', tags: ['chef', 'cooking', 'kitchen', 'hat', 'food'] },
  { title: 'Astronaut Kid', category: 'People', age: '4-8', topic: 'child dressed as astronaut dreaming of space', tags: ['astronaut', 'child', 'costume', 'space', 'dreams'] },
  { title: 'Ballet Dancer', category: 'People', age: '4-8', topic: 'ballet dancer in tutu doing pirouette', tags: ['ballet', 'dancer', 'tutu', 'dancing', 'graceful'] },
  { title: 'Superhero Kid', category: 'People', age: '4-8', topic: 'child dressed as superhero with cape', tags: ['superhero', 'cape', 'child', 'costume', 'powerful'] },
  { title: 'Princess Dress Up', category: 'People', age: '4-8', topic: 'girl dressed as princess with tiara', tags: ['princess', 'dress up', 'tiara', 'girl', 'royal'] },
  { title: 'Pirate Kid', category: 'People', age: '4-8', topic: 'child dressed as pirate with eye patch', tags: ['pirate', 'costume', 'eye patch', 'adventure', 'child'] },
  { title: 'Swimming', category: 'People', age: '4-8', topic: 'child swimming in pool with goggles', tags: ['swimming', 'pool', 'goggles', 'water', 'fun'] },
  { title: 'Reading Book', category: 'People', age: '4-8', topic: 'child reading book in cozy corner', tags: ['reading', 'book', 'learning', 'cozy', 'child'] },
  { title: 'Playing Music', category: 'People', age: '4-8', topic: 'child playing guitar making music', tags: ['music', 'guitar', 'playing', 'child', 'instrument'] },
  { title: 'Painting Art', category: 'People', age: '4-8', topic: 'child painting picture with easel', tags: ['painting', 'art', 'easel', 'creative', 'child'] },

  // ========== FOOD (15 pages) ==========
  { title: 'Ice Cream Cone', category: 'Food', age: '2-6', topic: 'delicious ice cream cone with scoops', tags: ['ice cream', 'cone', 'scoops', 'summer', 'yummy'] },
  { title: 'Birthday Cake', category: 'Food', age: '2-6', topic: 'birthday cake with candles and decorations', tags: ['cake', 'birthday', 'candles', 'celebration', 'sweet'] },
  { title: 'Cupcake', category: 'Food', age: '2-6', topic: 'decorated cupcake with frosting', tags: ['cupcake', 'frosting', 'sweet', 'decorated', 'yummy'] },
  { title: 'Pizza', category: 'Food', age: '4-8', topic: 'pizza with toppings and cheese', tags: ['pizza', 'cheese', 'toppings', 'yummy', 'food'] },
  { title: 'Fruit Bowl', category: 'Food', age: '4-8', topic: 'bowl of fresh fruits apple banana orange', tags: ['fruit', 'bowl', 'healthy', 'apple', 'banana'] },
  { title: 'Vegetables Garden', category: 'Food', age: '4-8', topic: 'garden vegetables carrot tomato lettuce', tags: ['vegetables', 'garden', 'healthy', 'carrot', 'tomato'] },
  { title: 'Donut', category: 'Food', age: '2-6', topic: 'donut with frosting and sprinkles', tags: ['donut', 'frosting', 'sprinkles', 'sweet', 'yummy'] },
  { title: 'Lollipop', category: 'Food', age: '2-6', topic: 'colorful swirl lollipop candy', tags: ['lollipop', 'candy', 'swirl', 'sweet', 'colorful'] },
  { title: 'Cookie', category: 'Food', age: '2-6', topic: 'chocolate chip cookie with chips', tags: ['cookie', 'chocolate', 'chips', 'sweet', 'yummy'] },
  { title: 'Hamburger', category: 'Food', age: '4-8', topic: 'hamburger with lettuce tomato cheese', tags: ['hamburger', 'burger', 'lettuce', 'cheese', 'food'] },
  { title: 'Hot Dog', category: 'Food', age: '4-8', topic: 'hot dog in bun with mustard', tags: ['hot dog', 'bun', 'mustard', 'food', 'yummy'] },
  { title: 'Popcorn', category: 'Food', age: '4-8', topic: 'bucket of popcorn for movie', tags: ['popcorn', 'movie', 'bucket', 'snack', 'yummy'] },
  { title: 'Watermelon', category: 'Food', age: '2-6', topic: 'watermelon slice with seeds', tags: ['watermelon', 'fruit', 'summer', 'seeds', 'sweet'] },
  { title: 'Strawberry', category: 'Food', age: '2-6', topic: 'big juicy strawberry with leaves', tags: ['strawberry', 'fruit', 'red', 'juicy', 'sweet'] },
  { title: 'Breakfast', category: 'Food', age: '4-8', topic: 'breakfast plate with eggs toast juice', tags: ['breakfast', 'eggs', 'toast', 'juice', 'morning'] },

  // ========== NATURE (15 pages) ==========
  { title: 'Rainbow', category: 'Nature', age: '2-6', topic: 'beautiful rainbow across sky with clouds', tags: ['rainbow', 'sky', 'clouds', 'colorful', 'pretty'] },
  { title: 'Sunflower', category: 'Nature', age: '4-8', topic: 'big sunflower with happy face', tags: ['sunflower', 'flower', 'sun', 'happy', 'yellow'] },
  { title: 'Rose', category: 'Nature', age: '4-8', topic: 'beautiful rose flower blooming', tags: ['rose', 'flower', 'blooming', 'pretty', 'petals'] },
  { title: 'Tulips', category: 'Nature', age: '4-8', topic: 'row of tulip flowers in garden', tags: ['tulips', 'flowers', 'garden', 'spring', 'pretty'] },
  { title: 'Tree In Seasons', category: 'Nature', age: '4-8', topic: 'tree with four seasons leaves', tags: ['tree', 'seasons', 'leaves', 'nature', 'changing'] },
  { title: 'Mountain Scene', category: 'Nature', age: '6-10', topic: 'mountain landscape with trees and lake', tags: ['mountain', 'landscape', 'trees', 'lake', 'nature'] },
  { title: 'Beach Scene', category: 'Nature', age: '4-8', topic: 'beach with sandcastle palm tree and sun', tags: ['beach', 'sandcastle', 'palm', 'sun', 'summer'] },
  { title: 'Camping', category: 'Nature', age: '4-8', topic: 'camping tent by campfire in woods', tags: ['camping', 'tent', 'campfire', 'woods', 'adventure'] },
  { title: 'Treehouse', category: 'Nature', age: '4-8', topic: 'treehouse in big oak tree', tags: ['treehouse', 'tree', 'oak', 'playing', 'adventure'] },
  { title: 'Garden', category: 'Nature', age: '4-8', topic: 'beautiful garden with flowers and path', tags: ['garden', 'flowers', 'path', 'pretty', 'nature'] },
  { title: 'Autumn Leaves', category: 'Nature', age: '4-8', topic: 'falling autumn leaves in wind', tags: ['autumn', 'leaves', 'falling', 'wind', 'colorful'] },
  { title: 'Snowflake', category: 'Nature', age: '4-8', topic: 'detailed snowflake crystal pattern', tags: ['snowflake', 'crystal', 'winter', 'pattern', 'cold'] },
  { title: 'Rainy Day', category: 'Nature', age: '4-8', topic: 'rainy day with umbrella and puddles', tags: ['rain', 'umbrella', 'puddles', 'weather', 'wet'] },
  { title: 'Bird In Nest', category: 'Nature', age: '4-8', topic: 'bird in nest with baby birds', tags: ['bird', 'nest', 'babies', 'tree', 'family'] },
  { title: 'Butterfly Life Cycle', category: 'Nature', age: '6-10', topic: 'butterfly life cycle caterpillar to butterfly', tags: ['butterfly', 'caterpillar', 'life cycle', 'nature', 'science'] },

  // ========== SPORTS (10 pages) ==========
  { title: 'Football', category: 'Sports', age: '4-8', topic: 'football and goal post', tags: ['football', 'goal', 'sports', 'ball', 'kick'] },
  { title: 'Basketball', category: 'Sports', age: '4-8', topic: 'basketball going into hoop', tags: ['basketball', 'hoop', 'sports', 'ball', 'score'] },
  { title: 'Tennis', category: 'Sports', age: '4-8', topic: 'tennis racket and ball', tags: ['tennis', 'racket', 'ball', 'sports', 'game'] },
  { title: 'Swimming Race', category: 'Sports', age: '4-8', topic: 'swimmer in swimming pool racing', tags: ['swimming', 'pool', 'racing', 'sports', 'water'] },
  { title: 'Gymnastics', category: 'Sports', age: '4-8', topic: 'gymnast doing splits', tags: ['gymnastics', 'splits', 'flexible', 'sports', 'athlete'] },
  { title: 'Ice Skating', category: 'Sports', age: '4-8', topic: 'figure skater on ice', tags: ['skating', 'ice', 'figure', 'sports', 'winter'] },
  { title: 'Skateboard', category: 'Sports', age: '6-10', topic: 'skateboard with cool design', tags: ['skateboard', 'cool', 'sports', 'wheels', 'tricks'] },
  { title: 'Surfing', category: 'Sports', age: '6-10', topic: 'surfer riding big wave', tags: ['surfing', 'wave', 'ocean', 'sports', 'beach'] },
  { title: 'Karate', category: 'Sports', age: '4-8', topic: 'karate kid in martial arts pose', tags: ['karate', 'martial arts', 'pose', 'sports', 'kick'] },
  { title: 'Horse Riding', category: 'Sports', age: '4-8', topic: 'child riding horse', tags: ['horse', 'riding', 'equestrian', 'sports', 'animal'] },

  // ========== LEARNING & EDUCATIONAL (15 pages) ==========
  { title: 'Alphabet Letter A', category: 'Learning', age: '2-6', topic: 'letter A with apple picture', tags: ['alphabet', 'letter A', 'apple', 'learning', 'ABC'] },
  { title: 'Alphabet Letter B', category: 'Learning', age: '2-6', topic: 'letter B with butterfly picture', tags: ['alphabet', 'letter B', 'butterfly', 'learning', 'ABC'] },
  { title: 'Numbers 1 2 3', category: 'Learning', age: '2-6', topic: 'numbers 1 2 3 with counting objects', tags: ['numbers', 'counting', '123', 'learning', 'math'] },
  { title: 'Shapes Circle Square', category: 'Learning', age: '2-6', topic: 'basic shapes circle square triangle', tags: ['shapes', 'circle', 'square', 'triangle', 'learning'] },
  { title: 'Colors Rainbow', category: 'Learning', age: '2-6', topic: 'rainbow colors red orange yellow green blue', tags: ['colors', 'rainbow', 'learning', 'red', 'blue'] },
  { title: 'Clock Time', category: 'Learning', age: '4-8', topic: 'clock face with numbers for learning time', tags: ['clock', 'time', 'numbers', 'learning', 'hours'] },
  { title: 'Days Of Week', category: 'Learning', age: '4-8', topic: 'days of week Monday to Sunday with pictures', tags: ['days', 'week', 'calendar', 'learning', 'Monday'] },
  { title: 'Months Of Year', category: 'Learning', age: '4-8', topic: 'months of year with seasonal pictures', tags: ['months', 'year', 'seasons', 'learning', 'calendar'] },
  { title: 'Weather Chart', category: 'Learning', age: '4-8', topic: 'weather symbols sun rain cloud snow', tags: ['weather', 'sun', 'rain', 'cloud', 'learning'] },
  { title: 'Body Parts', category: 'Learning', age: '4-8', topic: 'human body with labels for parts', tags: ['body', 'parts', 'learning', 'anatomy', 'health'] },
  { title: 'Emotions Faces', category: 'Learning', age: '4-8', topic: 'faces showing different emotions happy sad', tags: ['emotions', 'faces', 'happy', 'sad', 'feelings'] },
  { title: 'Opposites', category: 'Learning', age: '4-8', topic: 'opposite pairs big small hot cold', tags: ['opposites', 'big', 'small', 'learning', 'pairs'] },
  { title: 'Map World', category: 'Learning', age: '6-10', topic: 'world map with continents', tags: ['map', 'world', 'continents', 'geography', 'learning'] },
  { title: 'Solar System Planets', category: 'Learning', age: '6-10', topic: 'solar system planets with names', tags: ['solar system', 'planets', 'space', 'learning', 'science'] },
  { title: 'Life Cycle Frog', category: 'Learning', age: '6-10', topic: 'frog life cycle egg tadpole frog', tags: ['frog', 'life cycle', 'tadpole', 'science', 'learning'] },
]

function generateSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-') + '-colouring-page'
}

function buildPrompt(topic: string): string {
  return `Simple black and white colouring book page of ${topic}. Clean medium-weight black outlines that are easy to see and colour within. Pure white background, no shading, no gradients, no gray tones. Child-friendly printable line art. Professional colouring book style with clear readable lines.`
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const startIndex = body.startIndex || 0
  const count = body.count || 10

  const replicateToken = process.env.REPLICATE_API_TOKEN
  const results: string[] = []

  for (let i = startIndex; i < Math.min(startIndex + count, COLOURING_PAGES.length); i++) {
    const item = COLOURING_PAGES[i]
    const slug = generateSlug(item.title)

    const { data: existing } = await supabase
      .from('print_pages')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      results.push(`${item.title}: already exists`)
      continue
    }

    try {
      let buffer: Buffer
      const prompt = buildPrompt(item.topic)

      if (replicateToken) {
        // Use Replicate AI to generate image
        const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${replicateToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            input: { prompt, num_outputs: 1, aspect_ratio: '3:4', output_format: 'png' }
          })
        })

        if (!res.ok) throw new Error('Failed to start Replicate')

        const prediction = await res.json()
        let result = prediction
        let attempts = 0
        while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < 60) {
          await new Promise(r => setTimeout(r, 2000))
          const poll = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
            headers: { 'Authorization': `Bearer ${replicateToken}` }
          })
          result = await poll.json()
          attempts++
        }

        if (result.status !== 'succeeded') throw new Error('Generation failed')

        const imageUrl = result.output?.[0] || result.output
        if (!imageUrl) throw new Error('No output')

        const imgRes = await fetch(imageUrl)
        buffer = Buffer.from(await imgRes.arrayBuffer())
      } else {
        // Generate SVG placeholder and convert to PNG via Sharp
        const sharp = (await import('sharp')).default
        const svg = generatePlaceholderSvg(item.title, item.category, item.topic)
        buffer = await sharp(Buffer.from(svg)).png().toBuffer()
      }

      const previewPath = `previews/${slug}.png`

      // Try print-pages bucket first, fall back to images
      const { error: uploadError } = await supabase.storage
        .from('print-pages')
        .upload(previewPath, buffer, { contentType: 'image/png', upsert: true })

      if (uploadError) {
        await supabase.storage
          .from('images')
          .upload(previewPath, buffer, { contentType: 'image/png', upsert: true })
      }

      // Determine season from tags
      let season: string | null = null
      const seasonalTags = item.tags.map(t => t.toLowerCase())
      if (seasonalTags.includes('christmas') || seasonalTags.includes('winter')) season = 'winter'
      else if (seasonalTags.includes('easter') || seasonalTags.includes('spring')) season = 'spring'
      else if (seasonalTags.includes('halloween') || seasonalTags.includes('autumn')) season = 'autumn'
      else if (seasonalTags.includes('summer')) season = 'summer'

      await supabase.from('print_pages').insert({
        title: item.title + ' Colouring Page',
        slug,
        description: `Free printable ${item.title.toLowerCase()} colouring page for kids aged ${item.age}. ${item.topic}.`,
        category: item.category,
        tags: item.tags,
        age_range: item.age,
        season,
        preview_png_path: previewPath,
        source_storage_path: previewPath,
        featured: i < 20,
        sort_order: i,
        download_count: 0,
        view_count: 0,
        is_published: true,
      })

      results.push(`${item.title}: success`)

    } catch (err) {
      results.push(`${item.title}: ${err instanceof Error ? err.message : 'failed'}`)
    }
  }

  return NextResponse.json({
    results,
    nextIndex: startIndex + count,
    totalPages: COLOURING_PAGES.length,
    remaining: COLOURING_PAGES.length - (startIndex + count)
  })
}

function generatePlaceholderSvg(title: string, category: string, topic: string): string {
  // Simple but visually appealing SVG colouring page template
  const escapedTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const escapedTopic = topic.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="744" height="992" viewBox="0 0 744 992">
  <rect width="744" height="992" fill="white"/>
  <rect x="30" y="30" width="684" height="932" rx="20" fill="none" stroke="#E5E7EB" stroke-width="2"/>
  <rect x="40" y="40" width="664" height="912" rx="16" fill="none" stroke="#D1D5DB" stroke-width="1" stroke-dasharray="8,4"/>
  <text x="372" y="120" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#374151">${escapedTitle}</text>
  <text x="372" y="155" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#9CA3AF">${category} · colour.page</text>
  <rect x="80" y="180" width="584" height="700" rx="12" fill="none" stroke="#E5E7EB" stroke-width="1.5"/>
  <text x="372" y="520" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#D1D5DB">${escapedTopic}</text>
  <text x="372" y="550" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#E5E7EB">Colouring Page</text>
  <text x="372" y="920" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#D1D5DB">colour.page - Free Printable Colouring Pages</text>
</svg>`
}

export async function GET() {
  return NextResponse.json({
    message: 'POST with Authorization: Bearer ADMIN_SECRET',
    totalPages: COLOURING_PAGES.length,
    categories: [...new Set(COLOURING_PAGES.map(p => p.category))],
    samplePages: COLOURING_PAGES.slice(0, 10).map(p => ({ title: p.title, category: p.category }))
  })
}
