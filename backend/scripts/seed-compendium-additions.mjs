// Import the missing creature and entity records from the two supplied compendia.
// Run from backend with SANITY_PROJECT_ID, SANITY_DATASET, and SANITY_WRITE_TOKEN
// in .env. Documents use stable IDs; existing records are left untouched.

import 'dotenv/config'
import {createClient} from '@sanity/client'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IMAGES_DIR = path.join(__dirname, '..', 'images')
const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

const REGIONS = [
  {id: 'region.pacific-northwest', name: 'Pacific Northwest, United States', country: 'United States', lat: 45.5, lng: -122.7, centuries: 0, history: 'Modern Bigfoot reports overlap with a much older and diverse set of Indigenous traditions. This broad location is used for the modern cryptid report tradition, not as a substitute for specific Indigenous accounts.'},
  {id: 'region.pine-barrens', name: 'Pine Barrens, New Jersey', country: 'United States', lat: 39.8, lng: -74.6, centuries: 3, history: 'The Jersey Devil is a local New Jersey legend associated with the Pine Barrens and the Leeds family story.'},
  {id: 'region.loch-ness', name: 'Loch Ness, Scotland', country: 'United Kingdom', lat: 57.3, lng: -4.4, centuries: 0, history: 'The modern Loch Ness Monster legend became widely known after reports in 1933; older water-creature stories are also associated with the Highlands.'},
  {id: 'region.okanagan', name: 'Okanagan Lake, British Columbia', country: 'Canada', lat: 49.9, lng: -119.5, centuries: 5, history: 'Ogopogo is associated with Okanagan Lake and the Syilx (Okanagan) cultural landscape. The archive records the modern cryptid label separately from Indigenous traditions.'},
  {id: 'region.dine-southwest', name: 'Diné traditional region, Southwestern United States', country: 'United States', lat: 36.2, lng: -109.5, centuries: 0, history: 'The yee naaldlooshii belongs to Diné (Navajo) tradition. This region is approximate; the subject is culturally sensitive and is described at a high level.'},
  {id: 'region.michigan', name: 'Manistee County, Michigan', country: 'United States', lat: 44.2, lng: -86.3, centuries: 0, history: 'Modern Dogman reports in Michigan were popularized through twentieth-century local accounts and radio stories.'},
  {id: 'region.scape-ore', name: 'Scape Ore Swamp, South Carolina', country: 'United States', lat: 34.1, lng: -80.1, centuries: 0, history: 'The Lizard Man legend is associated with reports near Scape Ore Swamp beginning in 1988.'},
  {id: 'region.new-hampshire', name: 'New Hampshire, United States', country: 'United States', lat: 43.8, lng: -71.6, centuries: 0, history: 'Associated with the reported 1961 Betty and Barney Hill abduction account; the claims remain disputed and are not proof of extraterrestrial contact.'},
  {id: 'region.colombia-rural', name: 'Rural Colombia', country: 'Colombia', lat: 4.6, lng: -74.1, centuries: 3, history: 'La Patasola is a warning figure in Colombian oral folklore, with regional variants in rural and forest settings.'},
  {id: 'region.guatemala', name: 'Guatemala', country: 'Guatemala', lat: 14.6, lng: -90.5, centuries: 3, history: 'El Sombrerón is a figure in Guatemalan oral folklore, with stories varying by locality.'},
  {id: 'region.hartford', name: 'Hartford, Connecticut', country: 'United States', lat: 41.8, lng: -72.7, centuries: 0, history: 'Modern haunted-object claims associated with the Warrens are linked to Hartford-area accounts; these are claims, not independently verified paranormal evidence.'},
  {id: 'region.bavaria', name: 'Klingenberg am Main, Bavaria', country: 'Germany', lat: 49.8, lng: 9.2, centuries: 0, history: 'The Anneliese Michel case (1975–1976) was framed by participants as demonic possession and became the subject of criminal proceedings; the archive treats it as a documented belief and case history, not proof of possession.'},
  {id: 'region.arabian-peninsula', name: 'Arabian Peninsula', country: 'Saudi Arabia', lat: 24.0, lng: 45.0, centuries: 7, history: 'Jinn belong to pre-Islamic Arabic belief and Islamic textual and interpretive traditions, with beliefs and stories extending across Muslim communities.'},
  {id: 'region.ireland', name: 'Ireland', country: 'Ireland', lat: 53.3, lng: -7.7, centuries: 5, history: 'Banshee traditions are strongly associated with Irish oral folklore and the keening tradition; related stories also occur in Scotland.'},
  {id: 'region.london', name: 'London, United Kingdom', country: 'United Kingdom', lat: 51.5, lng: -0.1, centuries: 0, history: 'The Tower of London is one example used in modern residual-haunting lore; accounts are traditional reports rather than verified events.'},
  {id: 'region.argentina', name: 'Buenos Aires, Argentina', country: 'Argentina', lat: -34.6, lng: -58.4, centuries: 0, history: 'The Recoleta Cemetery is connected to local ghost-bride stories, including modern legends associated with historical figures; the haunting claims are not established history.'},
  {id: 'region.lancashire', name: 'Lancashire, England', country: 'United Kingdom', lat: 53.8, lng: -2.7, centuries: 2, history: 'Jenny Greenteeth is a northern English water-hag figure used in local folklore to warn children away from ponds covered with duckweed.'},
]

// Canonical labels follow the supplied Spanish compendia. Alleged traits and
// encounters are presented as folklore or reports, not as verified facts.
const CREATURES = [
  {
    key: 'bigfoot-sasquatch', name: 'Bigfoot / Sasquatch', regionalNames: ['Sasquatch', 'Bigfoot'], regionIds: ['region.pacific-northwest'], imageFile: null,
    physicalDescription: 'A purported large, bipedal, ape-like figure said to inhabit remote North American forests. Reports commonly describe dark hair, a powerful build, and unusually large footprints; no physical evidence has established the creature as a species.',
    distinctiveTraits: ['Reported height of roughly 2–2.7 m', 'Dark, long body hair in many accounts', 'Very large footprints', 'Often described as elusive and strongly odorous'], threatLevel: 'unknown',
    folkloreOrigin: 'Sasquatch-like figures occur in distinct Indigenous traditions of the Pacific Northwest; Bigfoot as a popular cryptid label spread in the twentieth century. These traditions are not interchangeable, and modern footprint or film claims remain disputed. The Patterson–Gimlin film was made near Bluff Creek, California, in 1967.'
  },
  {
    key: 'jersey-devil', name: 'Jersey Devil', regionalNames: ['Leeds Devil'], regionIds: ['region.pine-barrens'], imageFile: 'jersey-devil.png',
    physicalDescription: 'A legendary winged creature of New Jersey’s Pine Barrens, variously depicted with a horse-like or goat-like head, a long tail, hooves, and leathery wings.',
    distinctiveTraits: ['Horse- or goat-like head', 'Bat-like wings', 'Long tail', 'Cloven hooves', 'Shrill cry in some reports'], threatLevel: 'caution',
    folkloreOrigin: 'A regional New Jersey legend often linked to the Leeds family and a thirteenth child said to have transformed into a monster. The familiar origin story is folklore; a wave of reported tracks and sightings drew press attention in January 1909.'
  },
  {
    key: 'nessie-monstruo-del-lago-ness', name: 'Nessie (Monstruo del Lago Ness)', regionalNames: ['Loch Ness Monster', 'Nessie'], regionIds: ['region.loch-ness'], imageFile: 'nessie-monstruo-del-lago-ness.png',
    physicalDescription: 'A legendary aquatic creature said to inhabit Loch Ness in the Scottish Highlands. Modern accounts often describe a large dark body, one or more humps, and a long curved neck; descriptions vary and sightings are unverified.',
    distinctiveTraits: ['Long neck in many modern accounts', 'One or more humps breaking the water', 'Large dark aquatic form', 'Reported beneath the surface of Loch Ness'], threatLevel: 'harmless',
    folkloreOrigin: 'The Loch Ness Monster is part of Scottish Highland folklore. The modern worldwide legend took off after a 1933 newspaper account; earlier stories about water creatures in the Highlands are distinct sources rather than proof of one continuous sighting record.'
  },
  {
    key: 'ogopogo', name: 'Ogopogo', regionalNames: ['Naitaka'], regionIds: ['region.okanagan'], imageFile: 'ogopogo.png',
    physicalDescription: 'A lake-monster figure associated with Okanagan Lake in British Columbia, commonly pictured as a long, dark, serpentine animal with several humps and sometimes a horse-like head.',
    distinctiveTraits: ['Long, serpentine body', 'Several humps described above the water', 'Horse- or goat-like head in some depictions', 'Undulating swimming motion in reports'], threatLevel: 'unknown',
    folkloreOrigin: 'Ogopogo is the popular modern name for a lake-monster tradition associated with Okanagan Lake. The Syilx (Okanagan) cultural tradition has its own water-being accounts; they should not be collapsed into the later cryptid image or treated as zoological evidence.'
  },
  {
    key: 'skinwalker', name: 'Skinwalker', regionalNames: ['Yee Naaldlooshii'], regionIds: ['region.dine-southwest'], imageFile: 'skinwalker.png',
    physicalDescription: 'In Diné tradition, yee naaldlooshii refers to a person who uses harmful witchcraft and is associated in some accounts with animal transformation. This culturally sensitive figure is described here at a high level, without treating popular internet embellishments as traditional fact.',
    distinctiveTraits: ['Associated with harmful witchcraft in Diné tradition', 'Animal transformation appears in some accounts', 'Stories may include imitation of animal or human sounds', 'Culturally sensitive subject with accounts that vary'], threatLevel: 'dangerous',
    folkloreOrigin: 'The term belongs to Diné (Navajo) tradition. Popular accounts often mix Diné beliefs with contemporary paranormal claims, including the unrelated branding of the Skinwalker Ranch; these should be kept distinct.'
  },
  {
    key: 'dogman', name: 'Dogman', regionalNames: ['Michigan Dogman', 'Werewolf-like biped'], regionIds: ['region.michigan'], imageFile: 'dogman.png',
    physicalDescription: 'A modern North American cryptid reported as a large canine-headed humanoid that walks upright. Accounts vary in size, appearance, and behavior, and have not established a known animal.',
    distinctiveTraits: ['Canine or wolf-like head', 'Bipedal humanoid posture', 'Thick fur in many accounts', 'Howl sometimes compared to a human scream'], threatLevel: 'dangerous',
    folkloreOrigin: 'Michigan Dogman stories were popularized by a 1987 radio song and later listener accounts gathered by broadcaster Steve Cook. Reported encounters are anecdotal and remain unverified.'
  },
  {
    key: 'lizard-man-scape-ore-swamp', name: 'Lizard Man de Scape Ore Swamp', regionalNames: ['Lizard Man of Scape Ore Swamp', 'Lee County Lizard Man'], regionIds: ['region.scape-ore'], imageFile: 'lizard-man-scape-ore-swamp.png',
    physicalDescription: 'A reptilian humanoid from South Carolina reports, described as tall and bipedal, with green scales, clawed fingers, and red eyes.',
    distinctiveTraits: ['Green scaled skin in reports', 'Three clawed fingers in some accounts', 'Red eyes', 'Approximately human-sized or taller'], threatLevel: 'caution',
    folkloreOrigin: 'The legend arose after teenager Christopher Davis reported an encounter near Scape Ore Swamp in Lee County on June 29, 1988. The account and later vehicle-damage reports are local cryptid lore, not verified evidence of an animal.'
  },
  {
    key: 'ovnis-tripulantes-grises', name: 'OVNIs y sus tripulantes (Grises)', regionalNames: ['Grey aliens', 'Greys', 'Extraterrestres grises'], regionIds: ['region.new-hampshire'], imageFile: 'ovnis-tripulantes-grises.png',
    physicalDescription: 'A purported extraterrestrial being commonly described in modern abduction narratives as small and slender, with gray skin, a disproportionately large head, and large dark eyes. These descriptions are reports and cultural imagery, not established evidence of extraterrestrial life.',
    distinctiveTraits: ['Gray skin in common depictions', 'Large head and slender body', 'Large dark eyes', 'Telepathic communication is claimed in some abduction accounts'], threatLevel: 'unknown',
    folkloreOrigin: 'The modern “Grey” archetype developed through twentieth-century UFO and abduction stories. Betty and Barney Hill’s 1961 account in New Hampshire became influential; the reported experience is disputed and does not verify alien contact.'
  },
  {
    key: 'la-patasola', name: 'La Patasola', regionalNames: ['Patasola'], regionIds: ['region.colombia-rural'], imageFile: 'la-patasola.png',
    physicalDescription: 'A frightening woman-like figure from Colombian rural folklore, often shown with one leg or a single hoof-like foot. Some stories say she changes from an attractive woman into a predatory forest being.',
    distinctiveTraits: ['One leg or single hoof-like foot', 'Can appear as an attractive woman before changing form', 'Sharp teeth in some versions', 'Calls or cries from the forest'], threatLevel: 'dangerous',
    folkloreOrigin: 'La Patasola is an oral warning figure in Colombian countryside and forest stories. Versions differ by region and often warn against infidelity, isolation, or entering the forest alone.'
  },
  {
    key: 'el-sombreron', name: 'El Sombrerón', regionalNames: ['Sombrerón', 'Tzitzimite (regional variant)'], regionIds: ['region.guatemala'], imageFile: 'el-sombreron.png',
    physicalDescription: 'A small, darkly dressed folkloric figure recognizable by an oversized broad-brimmed hat. Guatemalan stories portray him pursuing women with long hair and serenading them with a guitar; details vary among tellings.',
    distinctiveTraits: ['Short stature in many accounts', 'Large broad-brimmed hat', 'Dark clothing', 'Guitar music and braided hair motifs'], threatLevel: 'caution',
    folkloreOrigin: 'El Sombrerón is a well-known figure in Guatemalan oral folklore. Stories describe a nocturnal suitor whose music and pursuit bring distress or illness; the precise details are local variants.'
  },
  {
    key: 'la-sayona', name: 'La Sayona', regionalNames: ['Sayona'], regionIds: ['region-llanos'], imageFile: 'la-sayona.png',
    physicalDescription: 'A Venezuelan folkloric apparition that may first appear as a beautiful woman and then reveal a terrifying form, often in white clothing with long hair obscuring her face.',
    distinctiveTraits: ['White or torn dress in many accounts', 'Long hair may hide the face', 'Sudden transformation into a frightening figure', 'Appears in stories about unfaithful men'], threatLevel: 'dangerous',
    folkloreOrigin: 'La Sayona is an oral legend associated especially with Venezuela’s Llanos. In common tellings, a woman becomes a wandering spirit who confronts or punishes men accused of infidelity; versions vary.'
  },
  {
    key: 'el-cuco-coco', name: 'El Cuco / El Coco', regionalNames: ['El Coco', 'El Cuco', 'Cuca'], regionIds: [], imageFile: 'el-cuco-coco.png',
    physicalDescription: 'An intentionally vague, frightening figure used in lullabies and warnings to encourage children to sleep or behave. Its form is usually left undefined, making it a shadowy threat rather than one consistent creature design.',
    distinctiveTraits: ['Form left undefined or shadow-like', 'Associated with darkness and nighttime', 'Appears in warnings and lullabies for children', 'Regional stories may place it under beds or in dark corners'], threatLevel: 'harmless',
    folkloreOrigin: 'El Coco / El Cuco is widespread in Iberian and Latin American oral tradition, with many local names and forms. The figure functions mainly as a child-directed warning character, not as a single creature with a fixed biography.'
  },
  {
    key: 'hombres-de-negro', name: 'Hombres de Negro (Men in Black)', regionalNames: ['Men in Black', 'MIB'], regionIds: ['region.hartford'], imageFile: 'hombres-de-negro.png',
    physicalDescription: 'Figures in UFO folklore described as unnaturally formal agents who visit witnesses after alleged sightings, sometimes warning them not to speak publicly. The stories are inconsistent and are not verified evidence of an organized group.',
    distinctiveTraits: ['Immaculate black suits', 'Unfamiliar or official-looking vehicles', 'Stiff or uncanny behavior in some accounts', 'Appear after UFO reports to intimidate or silence witnesses'], threatLevel: 'unknown',
    folkloreOrigin: 'The modern Men in Black motif grew from mid-twentieth-century UFO culture. Albert K. Bender’s reported 1953 experience helped popularize the story; later versions blend testimony, rumor, and entertainment.'
  },
  {
    key: 'shadow-people-hat-man', name: 'Shadow People (Gente de Sombra) / Hat Man', regionalNames: ['Shadow people', 'Hat Man', 'Gente de sombra'], regionIds: [], imageFile: 'shadow-people-hat-man.png',
    physicalDescription: 'A reported human-shaped dark silhouette with few or no visible features. The Hat Man is a recurring variant distinguished by a brimmed hat; many experiences are reported around sleep paralysis or the transition between sleep and waking.',
    distinctiveTraits: ['Featureless dark humanoid silhouette', 'Often described standing near the bed', 'Hat Man variant wears a brimmed hat', 'Frequently reported during sleep paralysis or partial waking'], threatLevel: 'unknown',
    folkloreOrigin: 'Shadow-person accounts circulate in contemporary paranormal culture and resemble older night-visitor traditions. Sleep paralysis is a recognized sleep phenomenon that can include vivid sensed-presence experiences; reports alone do not demonstrate an external entity.'
  },
  {
    key: 'incubo-sucubo', name: 'Íncubo y Súcubo', regionalNames: ['Incubus', 'Succubus', 'Incubi and succubi'], regionIds: [], imageFile: 'incubo-sucubo.png',
    physicalDescription: 'Paired figures in medieval European demonological lore: an incubus was said to visit women during sleep, and a succubus men. Accounts often describe a seductive presence, pressure on the chest, or sexual assault during the night.',
    distinctiveTraits: ['Appears during sleep in traditional accounts', 'Incubus and succubus are gendered forms in medieval texts', 'Associated with erotic dreams and pressure on the chest', 'Sometimes linked in modern reports to sleep paralysis'], threatLevel: 'dangerous',
    folkloreOrigin: 'Incubi and succubi appear in medieval European Christian demonology, including late-medieval theological writing. These are historical beliefs and legends; modern sleep-paralysis experiences are not evidence of demons.'
  },
  {
    key: 'santa-compana', name: 'La Santa Compaña', regionalNames: ['Santa Compaña', 'Estadea'], regionIds: ['region-galicia'], imageFile: 'la-santa-compana.png',
    physicalDescription: 'A nocturnal procession of the dead in Galician folklore, often described as hooded figures carrying candles and led by a living person compelled to carry a cross or vessel.',
    distinctiveTraits: ['Silent procession of hooded dead', 'Small lights or candles in the darkness', 'A living person may be forced to lead or carry a cross', 'Its appearance is treated as an omen of death'], threatLevel: 'caution',
    folkloreOrigin: 'La Santa Compaña is a Galician processional legend associated with rural roads and cemeteries at night. Regional versions differ in the procession’s name, leader, and the ritual said to release a living carrier.'
  },
  {
    key: 'espiritu-residual', name: 'Espíritu Residual (Residual Haunting)', regionalNames: ['Residual haunting', 'Repetitive haunting'], regionIds: ['region.london'], imageFile: 'espiritu-residual.png',
    physicalDescription: 'A category of haunting report in which a scene, sound, or figure is said to repeat in the same place without reacting to observers. The “recording” explanation is a popular hypothesis, not an established mechanism.',
    distinctiveTraits: ['Repeats the same route, sound, or action', 'Does not respond to witnesses', 'Usually attached to a place rather than a person', 'Sometimes linked in stories to a traumatic or repetitive event'], threatLevel: 'harmless',
    folkloreOrigin: 'Residual haunting is a modern paranormal classification applied to repetitive apparition stories, including some accounts associated with the Tower of London. The reports are traditional or anecdotal and have no verified paranormal cause.'
  },
  {
    key: 'espiritu-inteligente-interactivo', name: 'Espíritu Inteligente / Interactivo', regionalNames: ['Interactive spirit', 'Responsive haunting'], regionIds: [], imageFile: 'espiritu-inteligente-interactivo.png',
    physicalDescription: 'A category of haunting account in which a presence appears to react to witnesses, such as answering knocks, moving objects, or changing activity when addressed. The label describes the report pattern, not a proven type of being.',
    distinctiveTraits: ['Appears to answer questions through knocks or sounds', 'Objects are reported to move intentionally', 'Activity may seem to respond to particular people', 'Unlike a residual account, the presence is said to react'], threatLevel: 'caution',
    folkloreOrigin: 'The “intelligent” or interactive spirit is a modern parapsychological and popular classification of haunted-house stories. Accounts vary widely and do not establish that an external spirit is present.'
  },
  {
    key: 'poltergeist', name: 'Poltergeist', regionalNames: ['Noisy spirit', 'Disturbance haunting'], regionIds: ['region.london'], imageFile: 'poltergeist.png',
    physicalDescription: 'A noisy disturbance in haunting lore, associated with unexplained knocks, thrown objects, or moving furniture. Some parapsychologists have proposed recurrent spontaneous psychokinesis; ordinary causes and staged incidents have also been considered in individual cases.',
    distinctiveTraits: ['Loud knocks or unexplained sounds', 'Objects reported to move or be thrown', 'Furniture may appear to shift', 'Activity is often described as temporary and localized'], threatLevel: 'caution',
    folkloreOrigin: 'The German-derived word means roughly “noisy spirit.” The 1977–1979 Enfield case in north London is among the best-known modern reports investigated by members of the Society for Psychical Research; the case remains contested, and some incidents were admitted as tricks.'
  },
  {
    key: 'espiritu-acompanamiento-objeto', name: 'Espíritu de Acompañamiento (objeto embrujado)', regionalNames: ['Object-bound spirit', 'Haunted object'], regionIds: ['region.hartford'], imageFile: 'espiritu-de-acompanamiento-objeto-embrujado.png',
    physicalDescription: 'A modern haunting motif in which an alleged presence is attached to a movable object—such as a doll, mirror, or piece of jewelry—and is said to travel with it. Reported effects vary and are not independently verified.',
    distinctiveTraits: ['Allegedly attached to a specific object rather than a place', 'The object is reported to move or deteriorate without explanation', 'Owners may describe unease or oppression', 'The haunting is said to follow the object when it changes location'], threatLevel: 'dangerous',
    folkloreOrigin: 'Haunted-object stories occur in many traditions. The Annabelle doll story, publicized by Ed and Lorraine Warren in the 1970s, is a modern paranormal claim whose reported events are not independently established.'
  },
  {
    key: 'demonio-de-posesion', name: 'Demonio de Posesión', regionalNames: ['Possessing demon', 'Demonic possession'], regionIds: ['region.bavaria'], imageFile: 'demonio-de-posesion.png',
    physicalDescription: 'In Christian demonological belief, a nonhuman evil spirit may be said to take control of a person’s body or speech. Historical possession accounts describe altered voices, behavior, or strength; these claims are not proof of a supernatural cause.',
    distinctiveTraits: ['Altered or multiple voices are claimed in some accounts', 'Unusual strength is sometimes reported', 'Religious symbols may be said to provoke aversion', 'Historical accounts may describe unfamiliar speech or knowledge'], threatLevel: 'dangerous',
    folkloreOrigin: 'Demonic possession is a Christian religious and folkloric concept with biblical roots and a formalized Roman Catholic rite. The 1975–1976 Anneliese Michel case in Bavaria became a documented criminal case; it is recorded here as a case history, not as confirmation of possession.'
  },
  {
    key: 'jinn-genios', name: 'Jinn (Genios)', regionalNames: ['Jinn', 'Djinn', 'Genies'], regionIds: ['region.arabian-peninsula'], imageFile: 'jinn-genios.png',
    physicalDescription: 'A class of unseen beings in Arabic and Islamic traditions, described in Islamic scripture and later literature as created from smokeless fire. Stories give jinn varied forms and moral character; they are not simply equivalent to Christian demons.',
    distinctiveTraits: ['Unseen to humans in many accounts', 'Associated in Islamic scripture with smokeless fire', 'May be represented in different forms', 'Traditions describe both benevolent and harmful jinn'], threatLevel: 'unknown',
    folkloreOrigin: 'Jinn beliefs predate Islam and were incorporated into Islamic scripture and interpretation. They are discussed in the Qur’an, including a chapter named for them, and in Arabic and Persian traditions. Beliefs vary across communities.'
  },
  {
    key: 'dybbuk', name: 'Dybbuk', regionalNames: ['Dibbuk', 'Dibbuq'], regionIds: ['region-europa-este'], imageFile: 'dybbuk.png',
    physicalDescription: 'In Jewish folklore, a dybbuk is the restless soul of a deceased person believed to attach itself to a living person and speak or act through them. Stories commonly include a ritual exorcism by a learned rabbi.',
    distinctiveTraits: ['Believed to attach to or possess a living person', 'May speak through the person in traditional accounts', 'Often associated with an unsettled or sinful dead person', 'Stories describe expulsion through a religious ritual'], threatLevel: 'dangerous',
    folkloreOrigin: 'Dybbuk stories became prominent in early modern Jewish mysticism and Eastern European Jewish folklore. The term comes from a Hebrew root meaning to cling or adhere; the 1914 Yiddish play “The Dybbuk” later popularized the motif.'
  },
  {
    key: 'banshee', name: 'Banshee', regionalNames: ['Bean sí', 'Bean sidhe'], regionIds: ['region.ireland'], imageFile: 'banshee.png',
    physicalDescription: 'A female spirit in Irish folklore whose keening or cry is believed to foretell a death in a family. Descriptions vary: she may appear as a young woman or an old one, sometimes with long loose hair and pale or worn clothing.',
    distinctiveTraits: ['Piercing wail or keening cry', 'Associated with a particular family in many stories', 'Long loose hair in some descriptions', 'Appearing or crying is an omen, not usually a direct attack'], threatLevel: 'harmless',
    folkloreOrigin: 'The banshee (bean sí) belongs to Irish oral tradition, with related traditions in Scotland. Folklorists have connected descriptions of her cry and appearance with the historical practice of keening at wakes and funerals.'
  },
  {
    key: 'doppelganger', name: 'Doppelgänger', regionalNames: ['Doppelganger', 'Double walker'], regionIds: [], imageFile: 'doppelganger.png',
    physicalDescription: 'A ghostly double or exact counterpart of a living person. Folklore interprets an encounter as an omen in some traditions, while other stories treat the double as an unexplained duplicate; details are not consistent across accounts.',
    distinctiveTraits: ['Resembles a living person exactly', 'May be seen separately from the person it mirrors', 'Sometimes said not to cast a shadow or reflection', 'Often interpreted as an omen in later folklore'], threatLevel: 'unknown',
    folkloreOrigin: 'Doppelgänger is a German term, popularized in literature around the late eighteenth century, for a person’s double. Similar double motifs appear in other traditions. The Lincoln story is an anecdote reported by Mary Todd Lincoln, not a verified paranormal event.'
  },
  {
    key: 'dama-blanca-white-lady', name: 'Dama Blanca / White Lady', regionalNames: ['White Lady', 'Woman in White', 'Ladi Wen'], regionIds: [], imageFile: 'dama-blanca-white-lady.png',
    physicalDescription: 'A recurring female apparition motif, usually described in a long white garment. Individual local legends give her distinct histories, often involving bereavement, betrayal, murder, or a tragic death; there is no single universal White Lady.',
    distinctiveTraits: ['Female apparition dressed in white', 'Often attached to a specific road, building, or landscape', 'Local story may involve a tragic death or loss', 'Appearance and behavior vary by community'], threatLevel: 'unknown',
    folkloreOrigin: 'White Lady stories are recorded in many distinct European and other local traditions. Folklorists treat them as a recurring legend motif rather than one entity shared across countries; the alleged haunting is part of local storytelling.'
  },
  {
    key: 'novia-monja-fantasma', name: 'Novia / Monja Fantasma', regionalNames: ['Ghost bride', 'Phantom nun'], regionIds: ['region.argentina'], imageFile: 'novia-monja-fantasma.png',
    physicalDescription: 'A family of local ghost stories about a woman appearing in a wedding dress or religious habit, often near a convent, hospital, cemetery, or historic house. The details belong to each local legend rather than one shared biography.',
    distinctiveTraits: ['Wedding dress or nun’s habit', 'Associated with old buildings, cemeteries, or corridors', 'Footsteps or crying may be heard in some versions', 'Stories often connect the apparition with a tragic death'], threatLevel: 'unknown',
    folkloreOrigin: 'Ghost-bride and phantom-nun stories are recurring local legend types in Europe and Latin America. The Recoleta Cemetery story associated with Rufina Cambaceres blends a real death in 1902 with later popular legend; the haunting claims are not established history.'
  },
  {
    key: 'anima-sola', name: 'Ánima Sola', regionalNames: ['Anima Sola', 'The Lonely Soul'], regionIds: [], imageFile: 'anima-sola.png',
    physicalDescription: 'A devotional image and folkloric figure representing a soul in purgatory, often shown as a woman amid flames with chains broken or falling away. In popular devotion, prayers are offered for the soul’s release; it is not uniformly treated as a ghost or monster.',
    distinctiveTraits: ['Often represented as a woman amid flames', 'Chains symbolize suffering or bondage', 'Associated with prayers for souls in purgatory', 'In devotional imagery, seeks spiritual rest rather than harming people'], threatLevel: 'harmless',
    folkloreOrigin: 'Ánima Sola belongs to Catholic popular devotion concerning the souls in purgatory, especially in Hispanic America and parts of southern Europe. Its meanings vary and may differ from later folk-magic interpretations.'
  },
  {
    key: 'jenny-greenteeth', name: 'Jenny Greenteeth', regionalNames: ['Jinny Greenteeth', 'Wicked Jenny', 'Ginny Greenteeth'], regionIds: ['region.lancashire'], imageFile: 'jenny-greenteeth.png',
    physicalDescription: 'A northern English water-hag said to lurk beneath duckweed on ponds and still water. Modern depictions give her green skin, weed-like hair, and sharp teeth, though local accounts are not uniform.',
    distinctiveTraits: ['Green complexion or teeth in many depictions', 'Long hair likened to pond weeds', 'Lurks near duckweed-covered ponds', 'Said in warning stories to drag children into dangerous water'], threatLevel: 'dangerous',
    folkloreOrigin: 'Jenny Greenteeth is a Lancashire, Cheshire, and neighboring-county warning figure in northern English folklore. Nineteenth-century folklore collections record the name; the story helped discourage children from approaching weed-covered water.'
  },
]

async function ensureRegion(region) {
  await client.createIfNotExists({
    _id: region.id,
    _type: 'region',
    name: region.name,
    country: region.country,
    centroid: {_type: 'geopoint', lat: region.lat, lng: region.lng},
    centuriesOfTradition: region.centuries,
    folkloreHistory: region.history,
  })
}

async function uploadImageIfPresent(filename) {
  if (!filename) return null
  const filePath = path.join(IMAGES_DIR, filename)
  if (!fs.existsSync(filePath)) {
    console.warn(`Image missing; creating without illustration: ${filename}`)
    return null
  }
  const asset = await client.assets.upload('image', fs.createReadStream(filePath), {filename})
  return asset._id
}

async function seed() {
  if (!process.env.SANITY_PROJECT_ID || !process.env.SANITY_DATASET || !process.env.SANITY_WRITE_TOKEN) {
    throw new Error('Set SANITY_PROJECT_ID, SANITY_DATASET, and SANITY_WRITE_TOKEN in backend/.env')
  }

  for (const region of REGIONS) await ensureRegion(region)

  for (const creature of CREATURES) {
    const _id = `creature.${creature.key}`
    const existing = await client.fetch('*[_type == "creature" && (_id == $id || name == $name)][0]{_id,name}', {
      id: _id,
      name: creature.name,
    })
    if (existing) {
      console.log(`Already present, skipped: ${existing.name} (${existing._id})`)
      continue
    }

    const regionDocs = creature.regionIds.length
      ? await client.fetch('*[_type == "region" && _id in $ids]{_id}', {ids: creature.regionIds})
      : []
    const assetId = await uploadImageIfPresent(creature.imageFile)
    const doc = {
      _id,
      _type: 'creature',
      name: creature.name,
      regionalNames: creature.regionalNames,
      regions: regionDocs.map(({_id: id}) => ({_type: 'reference', _ref: id, _key: id})),
      physicalDescription: creature.physicalDescription,
      distinctiveTraits: creature.distinctiveTraits,
      threatLevel: creature.threatLevel,
      folkloreOrigin: creature.folkloreOrigin,
      ...(assetId ? {archiveIllustration: {_type: 'image', asset: {_type: 'reference', _ref: assetId}}} : {}),
    }
    await client.create(doc)
    console.log(`Created: ${creature.name}${assetId ? ` with ${creature.imageFile}` : ' without illustration'}`)
  }
}

seed().catch((error) => {
  console.error('Compendium import failed:', error.message)
  process.exit(1)
})
