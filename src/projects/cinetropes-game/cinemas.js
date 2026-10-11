// One cinema per family of the game's eighty: its name, its family, and the line the
// Projectionist says about its facade, translated from the game's French. `scene` is
// the facade's id in the game, the one the embedded demo opens; `console`, the colour
// of the Game Boy Color it plays on.
export const CINEMAS = [
  { id: 'regent', console: 'yellow', scene: 'scene_artdeco_european_urban_classic', name: 'Le Régent', theme: 'Art deco, European classic', line: 'Lovers always meet there too late.' },
  { id: 'empire', console: 'cyan', scene: 'scene_noir_european_urban_london_fog', name: 'Empire Leicester Square', theme: 'Noir, London fog', line: 'The English seats creak just like in the films.' },
  { id: 'haddonfield', console: 'berry', scene: 'scene_neon80s_american_urban_horror_slasher', name: 'The Haddonfield', theme: 'Neon 80s, slasher', line: 'Teenagers die on screen in the order of their sins.' },
  { id: 'berghain', console: 'purple', scene: 'scene_cyberpunk_european_urban_berlin_techno', name: 'Berghain Kino', theme: 'Cyberpunk, Berlin techno', line: 'No phones in the room. Strict rule.' },
  { id: 'starlite', console: 'lime', scene: 'scene_multiplex_american_suburban_drive_in', name: 'Starlite Drive-In', theme: 'Multiplex, American drive-in', line: 'Car horns stand in for applause at the end.' },
  { id: 'oktyabr', console: 'berry', scene: 'scene_brutalist_european_urban_eastern_bloc', name: "L'Oktyabr", theme: 'Brutalist, Eastern Bloc', line: 'The State picks the film. The audience picks how to read it.' },
  { id: 'almeria', console: 'yellow', scene: 'scene_western_american_desert_spaghetti', name: 'Cinema Almería', theme: 'Western, spaghetti desert', line: "Morricone's harmonica still rings in the room after the film ends." },
  { id: 'nitehawk', console: 'cyan', scene: 'scene_arthouse_american_urban_indie_brooklyn', name: 'Nitehawk Cinema', theme: 'Arthouse, indie Brooklyn', line: 'The lobby sells LPs and risograph programmes.' },
  { id: 'bagdad', console: 'lime', scene: 'scene_historic_middle_eastern_urban_caravanserai', name: 'Bagdad Cinema', theme: 'Historic, caravanserai', line: 'The battles on screen raise as much dust as the caravans.' },
  { id: 'eden', console: 'lime', scene: 'scene_animation_european_rural_amelie_jeunet', name: "L'Eden", theme: 'Animation, Amélie village', line: 'The village cat sleeps on the back-row seat.' },
  { id: 'lunar', console: 'purple', scene: 'scene_space_station_orbital_scifi', name: 'The Lunar', theme: 'Space, orbital station', line: 'Earth shows through the window while you wait for the film.' },
]
