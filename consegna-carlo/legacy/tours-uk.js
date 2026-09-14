const TOURS={
rebuilding:{name:"Rebuilding London",city:"London",region:"United Kingdom",dur:"≈ 2h 30′ · estimate",center:[51.5096,-0.1063],
 guides:[
  {id:"wren",name:"Sir Christopher Wren",role:"AI Living Guide",bio:"The architect who redrew the city after the Great Fire. He reads London in domes, sightlines and the stubbornness of stone.",init:"W"},
  {id:"holmes",name:"Sherlock Holmes",role:"AI Living Guide",bio:"The same streets read as evidence: soot, brick and the traces people leave behind.",init:"H",soon:true},
  {id:"wilde",name:"Oscar Wilde",role:"AI Living Guide",bio:"London as a stage. Less about dates, more about the manners of the people who built it.",init:"O",soon:true},
  {id:"fogg",name:"Phileas Fogg",role:"AI Living Guide",bio:"The city as a departure point: clocks, timetables and the appetite for elsewhere.",init:"F",soon:true}],
 stops:[
  {t:"Guildhall & the Roman Amphitheatre",p:"Guildhall Yard, EC2V",c:[51.51552,-0.0922],d:"Beneath the medieval hall lies the arena of Roman Londinium, its outline traced in dark stone across the yard above. Two cities, one footprint."},
  {t:"St Bartholomew the Great",p:"West Smithfield, EC1A",c:[51.51903,-0.09992],d:"The oldest parish church in the City, founded 1123. The Great Fire never reached it, so this is London as it stood before I was asked to rebuild the rest."},
  {t:"St Paul's Cathedral",p:"St Paul's Churchyard, EC4M",c:[51.51371,-0.0995],d:"Thirty-five years of my life. The dome had to be seen from the river and hold its own against the sky — everything else followed from that."},
  {t:"Millennium Bridge",p:"Thames crossing, Bankside",c:[51.5095,-0.09846],d:"A line drawn between the cathedral and the far bank in the year 2000. The city still argues with the river, and still keeps crossing it."},
  {t:"Tate Modern",p:"Bankside, SE1",c:[51.50758,-0.09938],d:"A power station turned gallery. London does not often demolish what it stops needing — it gives it another purpose."},
  {t:"South Bank",p:"Book market under Waterloo Bridge",c:[51.50711,-0.11641],d:"Second-hand books laid out under the arches, whatever the weather. The stretch of river that belongs to no institution at all."},
  {t:"London Eye",p:"Riverside Building, SE1",c:[51.50331,-0.11957],d:"For three centuries the dome was the highest thing here. Now the city is read from a slow wheel on the south bank — the same instinct, turning."},
  {t:"Big Ben / Elizabeth Tower",p:"Westminster, SW1A",c:[51.50072,-0.12462],d:"The clock that set the country's time. This is where I leave you for today — the square ahead has its own story, and its own guide."}]},

westminster:{name:"Westminster: Parliament & the Abbey",city:"London",region:"United Kingdom",dur:"≈ 2h · 7 stops",soon:true,
 teaser:"This is where I leave you for today. But this square, Parliament, Westminster Abbey, the seat of government itself, deserves its own telling, and its own guide. Join us for the next chapter of London's story.",
 by:"Sir Christopher Wren, closing Rebuilding London",
 center:[51.4995,-0.1248],guides:[],stops:[]}
};
const VIDEOS={
 rebuilding:["Ldn-01-guildhall","Ldn-02-st-bartholomew","Ldn-03-st-pauls","Ldn-04-millennium","Ldn-05-tate","Ldn-06-southbank","Ldn-07-london-eye","Ldn-08-bigben"]
};
const CHAT={
 wren:["I rebuilt fifty-two churches in this city and buried myself under one of them. Ask me about stone, fire, or what London refused to let me build."]
};
const CHIPS={
 wren:["Why is the dome that shape?","What did the Fire destroy?","What did London reject?","How far to the next stop?"]
};
const REPLY={
 wren:["The Fire of 1666 cleared four-fifths of the walled city in four days. What you walk through is not old London — it is the answer to that fire.","I proposed straight avenues and open squares. The city refused: property lines were older than my drawings, and they won. London is medieval underneath and Georgian on the surface.","AiCicerone doesn't pretend to be infallible. If a date or a name looks wrong to you, use «Report a discrepancy» and the editorial team will check it."]
};
