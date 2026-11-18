-- Sprites de Pestouille RPG, dessinés par code (Aseprite 1.3, mode -b). Une source texte, des sorties reproductibles.
-- usage : aseprite -b --script-param out=<dossier> --script art/sprites.lua
-- Chaque sprite : 32x32, deux cadres (respiration : le cadre 2 descend d'un pixel), tag « idle ».
local out = app.params["out"]
local function hex(h)
  return app.pixelColor.rgba(tonumber(h:sub(2,3),16), tonumber(h:sub(4,5),16), tonumber(h:sub(6,7),16), 255)
end
local C = {
  red="#ed4d4c", redd="#b8333a", cream="#f6e7c1", gold="#e8b84a", mint="#7fe0c0", mintd="#4fb898", eye="#2b1d14", ink="#2b1d14",
  skin="#f2c9a0", auburn="#b5482a", moss="#5d7a3a", mossl="#86a957", cape="#6b4a2b", leaf="#6fbf4a",
  violet="#7a5cc4", violetl="#a58ae6", blond="#f0e0a0", wood="#8a5a33", steel="#8a96a6", steell="#c3ccd8", beard="#d9772b",
  teal="#2e5d66", teall="#4f8c96", green="#6aa84f", greend="#3f7a34", orange="#f08a24", yellow="#ffd34d",
  blue="#4fa3c7", bluel="#9ad3ea", pad="#5fb35a", pink="#f4a7c0", wind="#cfe8f5", windd="#8fbfd9",
  bramble="#4a5a2a", brambled="#2f3a1a", thorn="#c9b48a", ember="#ff5a3c", amber="#f5b942", amberl="#ffe9a8", white="#ffffff"
}
local img, dy
local function px(x, y, c) if x >= 0 and x < 32 and y + dy >= 0 and y + dy < 32 then img:drawPixel(x, y + dy, hex(C[c] or c)) end end
local function rect(x, y, w, h, c) for j = y, y + h - 1 do for i = x, x + w - 1 do px(i, j, c) end end end
local function ell(cx, cy, rx, ry, c)
  for j = math.floor(cy - ry), math.ceil(cy + ry) do for i = math.floor(cx - rx), math.ceil(cx + rx) do
    local u, v = (i - cx) / rx, (j - cy) / ry
    if u * u + v * v <= 1.0 then px(i, j, c) end
  end end
end
local function tri(x1, y1, x2, y2, x3, y3, c)
  for j = math.min(y1, y2, y3), math.max(y1, y2, y3) do for i = math.min(x1, x2, x3), math.max(x1, x2, x3) do
    local d1 = (i - x2) * (y1 - y2) - (x1 - x2) * (j - y2)
    local d2 = (i - x3) * (y2 - y3) - (x2 - x3) * (j - y3)
    local d3 = (i - x1) * (y3 - y1) - (x3 - x1) * (j - y1)
    local neg = d1 < 0 or d2 < 0 or d3 < 0
    local pos = d1 > 0 or d2 > 0 or d3 > 0
    if not (neg and pos) then px(i, j, c) end
  end end
end
local function eyes(x1, x2, y, c) px(x1, y, c or "eye"); px(x2, y, c or "eye") end

local R = {}
R.pestouille = function(f)
  tri(5, 10, 13, 14, 9, 22, "mint"); tri(4, 12, 11, 16, 7, 21, "mintd") -- aile menthe (battement)
  if f == 2 then tri(5, 12, 13, 15, 8, 23, "mint") end
  ell(15, 20, 8, 7, "red"); ell(16, 21, 5, 5, "cream")                    -- corps, ventre crème
  tri(22, 22, 29, 26, 22, 26, "red"); px(29, 25, "redd")                    -- queue
  ell(19, 11, 6, 5, "red"); ell(23, 13, 3, 2, "red")                        -- tête, museau
  tri(15, 7, 16, 3, 18, 7, "gold"); tri(19, 6, 21, 2, 22, 7, "gold")        -- cornes dorées
  px(21, 10, "gold"); px(21, 11, "eye"); px(25, 13, "redd")                 -- œil doré, narine
  rect(11, 26, 3, 2, "redd"); rect(17, 26, 3, 2, "redd")                    -- pattes
end
R.eglantine = function(f)
  tri(10, 14, 22, 14, 16, 29, "cape")                                        -- cape brune
  rect(12, 15, 8, 11, "moss"); rect(12, 19, 8, 1, "cape")                    -- tenue vert mousse, ceinture
  rect(12, 26, 3, 3, "cape"); rect(17, 26, 3, 3, "cape")                     -- bottes
  ell(16, 10, 5, 5, "skin")
  ell(16, 7, 6, 3, "auburn"); px(10, 9, "auburn"); px(22, 9, "auburn"); px(11, 11, "auburn"); px(21, 11, "auburn") -- boucles rousses
  for i = 11, 21, 2 do px(i, 4, "leaf") end; rect(11, 5, 11, 1, "leaf")     -- couronne de feuilles
  eyes(14, 18, 10); px(16, 12, "redd")
  rect(21, 17, 2, 5, "cream"); px(21, 16, "wood")                            -- carte roulée
end
R.lila = function(f)
  tri(9, 28, 23, 28, 16, 13, "violet"); tri(11, 28, 21, 28, 16, 17, "violetl")
  ell(16, 10, 4, 4, "skin"); ell(16, 7, 5, 3, "blond"); rect(11, 8, 2, 6, "blond"); rect(20, 8, 2, 6, "blond")
  eyes(14, 18, 10)
  rect(24, 8, 1, 20, "wood"); ell(24, 7, 2, 2, f == 1 and "amber" or "amberl") -- bâton à lumière
end
R.borin = function(f)
  rect(10, 15, 12, 11, "steel"); rect(10, 15, 12, 2, "steell")
  ell(16, 10, 5, 4, "skin"); ell(16, 7, 6, 3, "steel"); rect(10, 7, 12, 1, "steell")
  tri(12, 11, 20, 11, 16, 18, "beard"); eyes(14, 18, 9)
  rect(11, 26, 4, 3, "ink"); rect(17, 26, 4, 3, "ink")
  ell(7, 20, 4, 6, "wood"); ell(7, 20, 2, 3, "gold")                         -- bouclier
end
R.nox = function(f)
  rect(11, 15, 10, 11, "teal"); tri(10, 14, 22, 14, 16, 4, "teal")           -- capuche
  ell(16, 11, 4, 3, "skin"); eyes(14, 18, 11); rect(12, 26, 3, 3, "ink"); rect(17, 26, 3, 3, "ink")
  for j = 8, 24 do px(24 + math.floor(math.abs(j - 16) / 4), j, "wood") end  -- arc
  rect(23, 8, 1, 17, "teall")
end
R.mossling = function(f)
  ell(16, 22, 9, 7, "green"); ell(16, 24, 7, 4, "greend")
  rect(16, 10, 1, 6, "greend"); ell(13, 11, 3, 2, "leaf"); ell(19, 10, 3, 2, "leaf") -- pousse
  eyes(13, 19, 21, "ink"); px(16, 23, "ink")
end
R.flameling = function(f)
  ell(16, 21, 7, 7, "orange"); tri(10, 20, 22, 20, f == 1 and 16 or 17, 6, "orange"); tri(12, 21, 20, 21, 15, 11, "yellow")
  ell(16, 23, 4, 4, "yellow"); eyes(14, 18, 21, "ink")
end
R.dewdrop = function(f)                                                      -- Nénuphine : têtard-nénuphar
  tri(6, 20, 12, 18, 12, 23, "bluel"); if f == 2 then tri(5, 22, 12, 19, 12, 24, "bluel") end -- queue
  ell(17, 21, 8, 6, "blue"); ell(18, 23, 5, 3, "bluel")
  ell(18, 13, 8, 3, "pad"); tri(18, 13, 26, 12, 26, 14, "blue")              -- feuille de nénuphar échancrée
  px(17, 12, "pink"); px(18, 11, "pink"); px(19, 12, "pink")                  -- bouton de fleur
  eyes(16, 21, 20, "ink"); px(19, 23, "ink")
end
R.gustling = function(f)
  ell(16, 18, 8, 6, "wind"); ell(12, 14, 4, 3, "wind"); ell(21, 13, 3, 3, "windd")
  for i = 0, 6 do px(6 + i, 24 + (i % 2), "windd") end; for i = 0, 5 do px(20 + i, 24 - (i % 2) + (f - 1), "windd") end
  eyes(14, 19, 18, "ink")
end
R.roncier = function(f)
  ell(16, 20, 13, 10, "bramble"); ell(16, 22, 10, 7, "brambled")
  for _, p in ipairs({{4, 12}, {9, 7}, {16, 5}, {23, 7}, {28, 12}, {3, 22}, {29, 22}}) do tri(p[1], p[2], 16, 16, 16, 20, "bramble"); px(p[1], p[2], "thorn") end
  ell(11, 18, 2, 2, "ember"); ell(21, 18, 2, 2, "ember"); if f == 2 then px(11, 18, "yellow"); px(21, 18, "yellow") end
  rect(12, 24, 9, 2, "ink"); for i = 12, 20, 2 do px(i, 23, "thorn") end
end
R.rejeton = function(f)
  ell(16, 24, 6, 4, "bramble"); tri(12, 22, 16, 10, 20, 22, "bramble"); px(16, 10, "thorn"); px(13, 16, "thorn"); px(19, 15, "thorn")
  eyes(14, 18, 23, "ember")
end
-- Icônes de HUD (D3) : flammèche = PV, cristal de luciole rond ambré = monnaie, herbe, clé de racine, flamme.
R.icon_pv = function(f) tri(10, 26, 22, 26, 16, 6, "orange"); ell(16, 22, 6, 5, "orange"); ell(16, 23, 3, 3, "yellow") end
R.icon_cristal = function(f) ell(16, 16, 8, 8, "amber"); ell(14, 14, 3, 3, "amberl"); px(13, 13, "white") end
R.icon_herbe = function(f) rect(15, 12, 2, 14, "greend"); ell(11, 14, 4, 2, "leaf"); ell(21, 18, 4, 2, "leaf"); ell(12, 21, 3, 2, "green") end
R.icon_cle = function(f) ell(10, 16, 5, 5, "wood"); ell(10, 16, 2, 2, "brambled"); rect(14, 15, 12, 3, "wood"); rect(22, 18, 2, 4, "wood"); rect(25, 18, 2, 3, "wood") end
R.icon_flamme = function(f) tri(9, 27, 23, 27, 16, 4, "ember"); ell(16, 22, 7, 6, "ember"); tri(12, 26, 20, 26, 16, 11, "gold"); ell(16, 23, 3, 3, "white") end

local names = {}
for k in pairs(R) do names[#names + 1] = k end
table.sort(names)
for _, name in ipairs(names) do
  local spr = Sprite(32, 32, ColorMode.RGB)
  spr:newFrame()
  for f = 1, 2 do
    img = Image(32, 32, ColorMode.RGB)
    dy = (f == 2 and not name:match("^icon_")) and 1 or 0
    R[name](f)
    spr.cels[f].image = img
  end
  spr:newTag(1, 2).name = "idle"
  spr:saveAs(out .. "/" .. name .. ".aseprite")
  spr:close()
end
print(#names .. " sprites")
