# 只畫剪影（X），上色交給 autoshade：
#   左上邊緣→亮部3   右下邊緣→暗部2   內部→基本色1   右下外側→深輪廓4
SIL = {
"松樹": ["......X......",".....XXX.....",".....XXX.....","....XXXXX....","...XXXXXXX...",
         ".....XXX.....","....XXXXX....","...XXXXXXX...","..XXXXXXXXX..",
         "....XXXXX....","...XXXXXXX...","..XXXXXXXXX..",".XXXXXXXXXXX.",
         "......X......","......X......",".....XXX....."],
"闊葉樹": ["....XXXXX....","..XXXXXXXXX..",".XXXXXXXXXXX.","XXXXXXXXXXXXX","XXXXXXXXXXXXX",
           ".XXXXXXXXXXX.","..XXXXXXXXX..","...XXXXXXX...","......X......","......X......",
           "......X......",".....XXX....."],
"草叢": ["...X.......X...","..XX..X...XX...","..XX.XX..XXX...",".XXX.XX..XXX...",
         ".XXXXXXXXXXXX..","..XXXXXXXXXX..."],
"花": ["..XX.XX..",".XXXXXXX.","XXXXXXXXX","XXXXXXXXX","XXXXXXXXX",
       ".XXXXXXX.","..XX.XX..","....X....",".XXXX....","....X....","....XXXX.","....X...."],
"雲": ["....XXXX.....","..XXXXXXXXX..",".XXXXXXXXXXX.","XXXXXXXXXXXXX",".XXXXXXXXXXX."],
"月": ["...XXX...","..XXXX...",".XXXX....",".XXX.....","XXXX.....",".XXX.....",
       ".XXXX....","..XXXX...","...XXX..."],
"星": [".....X.....",".....X.....","....XXX....","....XXX....","XXXXXXXXXXX",
       ".XXXXXXXXX.","..XXXXXXX..","..XXXXXXX..",".XXX...XXX.",".XX.....XX.","X.........X"],
"鳥_飛": [".X.......X.","..XX...XX..","...XXXXX...","....XXX...."],
"鳥_停": [".....XXXX....","....XXXXXX...","....XXXXXXXX.","...XXXXXXXX..",
          "..XXXXXXXXX..",".XXXXXXXXXX..","XXXXXXXXXXX..","XXXXXXXXXX...",
          ".XXXXXXXX....","...XX.XX.....","..XX...XX...."],
"魚": ["X.......XXX...","XX....XXXXXXX.","XXX.XXXXXXXXXX","XXXXXXXXXXXXXX",
       "XXX.XXXXXXXXXX","XX....XXXXXXX.","X.......XXX..."],
"貓": [".XX.......XX.",".XXX.....XXX.",".XXXXXXXXXXX.",".XXXXXXXXXXX.",
       "..XXXXXXXXX..","..XXXXXXXXX..","..XXXXXXXXX..","..XXXXXXXXX..",
       ".XXXXXXXXXX..",".XXXXXXXXXXX.",".XXXXXXXXXX.X","..XXXXXXXX.XX","..XXXXXXXX.XX"],
}

def autoshade(sil):
    H=len(sil); W=max(len(r) for r in sil)
    g=[r.ljust(W,'.') for r in sil]
    f=lambda x,y: 0<=x<W and 0<=y<H and g[y][x]=='X'
    out=[['.']*W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            if f(x,y):
                if not f(x,y-1) or not f(x-1,y):   out[y][x]='3'   # 受光的上/左緣
                elif not f(x,y+1) or not f(x+1,y): out[y][x]='2'   # 背光的下/右緣
                else:                               out[y][x]='1'
            else:
                if f(x,y-1) or f(x-1,y):            out[y][x]='4'   # 右下外側深邊
    return [''.join(r) for r in out]

SCENE = {k: autoshade(v) for k,v in SIL.items()}
