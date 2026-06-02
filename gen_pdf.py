# -*- coding: utf-8 -*-
from fpdf import FPDF

W, H = 297, 210
INDIGO=(79,70,229); BRAND=(99,102,241); SOFT=(238,242,255); INK=(30,27,75)
BG=(241,245,249); MUTED=(100,116,139); LINE=(226,232,240); OK=(22,163,74)
OKBG=(240,253,244); WHITE=(255,255,255); SLATE=(51,65,85); GREENB=(187,247,208)
TEAL=(13,148,136); AMBER=(180,131,10)
DJ="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
DJB="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

pdf = FPDF(orientation='L', unit='mm', format='A4')
pdf.set_auto_page_break(False)
pdf.add_font('DJ','',DJ); pdf.add_font('DJ','B',DJB)

def bg(c): pdf.set_fill_color(*c); pdf.rect(0,0,W,H,'F')
def txt(x,y,s,size,color=INK,bold=False):
    pdf.set_font('DJ','B' if bold else '',size); pdf.set_text_color(*color)
    pdf.set_xy(x,y); pdf.cell(0,size*0.38,s)
def rtxt(x,y,w,s,size,color=INK,bold=False):
    pdf.set_font('DJ','B' if bold else '',size); pdf.set_text_color(*color)
    pdf.set_xy(x,y); pdf.cell(w,size*0.38,s,align='R')
def para(x,y,w,s,size,color=SLATE,bold=False,lh=1.5):
    pdf.set_font('DJ','B' if bold else '',size); pdf.set_text_color(*color)
    pdf.set_xy(x,y); pdf.multi_cell(w,size*0.40*lh,s)
def card(x,y,w,h,fill=WHITE):
    pdf.set_fill_color(*fill); pdf.set_draw_color(*LINE); pdf.set_line_width(0.3); pdf.rect(x,y,w,h,'DF')
def pill(x,y,s,fg=INDIGO,bgc=SOFT):
    pdf.set_font('DJ','B',10); w=pdf.get_string_width(s)+10
    pdf.set_fill_color(*bgc); pdf.rect(x,y,w,7.5,'F')
    pdf.set_text_color(*fg); pdf.set_xy(x,y+0.7); pdf.cell(w,6,s,align='C'); return w
def logo(x,y,size):
    pdf.set_font('DJ','B',size); pdf.set_text_color(*INDIGO); pdf.set_xy(x,y); pdf.cell(0,size*0.4,"ia")
    wia=pdf.get_string_width("ia"); pdf.set_text_color(*INK); pdf.set_xy(x+wia,y); pdf.cell(0,size*0.4,"limp")
def kicker(x,y,s): txt(x,y,s.upper(),10,BRAND,True)
def footer(s): txt(24,H-15,s,9,(148,163,184),False)

# ── 1 · PORTADA ──
pdf.add_page(); bg(WHITE)
logo(24,28,30); pill(24,50,"Propuesta para Sique Brilla")
txt(24,68,"Cobrar a tus propietarios",30,INK,True)
txt(24,84,"sin perseguir a nadie.",30,INK,True)
para(24,106,238,"Cada mes, el propietario recibe su liquidación de limpiezas, da el OK y se le cobra. "
     "Tú eliges cómo cobra cada cliente: tarjeta o recibo bancario. Todo claro y automático.",16,SLATE)
footer("IALIMP — gestión de limpiezas de pisos turísticos")

# ── 2 · EL PROBLEMA ──
pdf.add_page(); bg(BG)
kicker(24,26,"Cómo se cobra hoy")
txt(24,36,"Cobrar a final de mes cuesta tiempo y nervios.",22,INK,True)
probs=[("Perseguir el pago","Mandar el detalle, esperar la transferencia y recordar a los que se olvidan."),
       ("Facturas a mano","Cuadrar limpiezas, hacer la factura y enviarla, piso por piso."),
       ("Cobro tardío","El dinero entra cuando el propietario se acuerda, no cuando toca.")]
cw=78; x0=24; y0=66
for i,(t,d) in enumerate(probs):
    x=x0+i*(cw+10); card(x,y0,cw,72); pdf.set_fill_color(*INDIGO); pdf.rect(x,y0,cw,3,'F')
    txt(x+8,y0+14,t,15,INK,True); para(x+8,y0+26,cw-16,d,12,MUTED)

# ── 3 · LA SOLUCIÓN ──
pdf.add_page(); bg(WHITE)
kicker(24,26,"La solución con IALIMP")
txt(24,36,"Un flujo automático a fin de mes.",22,INK,True)
steps=[("El propietario recibe su liquidación","A fin de mes le llega el resumen de todas las limpiezas, con su importe."),
       ("Da el OK","Lo revisa desde su portal privado y aprueba con un clic."),
       ("Se le cobra y se genera la factura","Se le pasa el cobro (tarjeta o recibo), el dinero entra en tu cuenta y la factura se genera sola.")]
y=60
for i,(t,d) in enumerate(steps):
    pdf.set_fill_color(*INDIGO); pdf.ellipse(24,y,13,13,'F')
    pdf.set_font('DJ','B',16); pdf.set_text_color(*WHITE); pdf.set_xy(24,y+2.2); pdf.cell(13,8,str(i+1),align='C')
    txt(44,y+0.5,t,16,INK,True); para(44,y+8,215,d,13,MUTED); y+=31
pdf.set_fill_color(*OKBG); pdf.set_draw_color(*GREENB); pdf.rect(24,y+1,250,15,'DF')
para(30,y+4,242,"Y tú eliges, por cada cliente, cómo cobra: tarjeta (al momento) o recibo bancario (más barato).",12,(22,101,52),True)

# ── 4 · DOS FORMAS DE COBRAR ──
pdf.add_page(); bg(BG)
kicker(24,26,"Tú decides por cada propietario")
txt(24,36,"Dos formas de cobrar. Elige la que convenga.",22,INK,True)
def metodo(x,y,w,h,barcol,title,coste,cuando,ideal):
    card(x,y,w,h); pdf.set_fill_color(*barcol); pdf.rect(x,y,w,4,'F')
    txt(x+9,y+13,title,17,INK,True)
    txt(x+9,y+27,"COSTE",9,MUTED,True); para(x+9,y+33,w-18,coste,12.5,SLATE,True)
    txt(x+9,y+50,"CUÁNDO COBRAS",9,MUTED,True); txt(x+9,y+56,cuando,13.5,barcol,True)
    txt(x+9,y+70,"IDEAL PARA",9,MUTED,True); para(x+9,y+76,w-18,ideal,12,MUTED)
cw=118; y0=58; h=92
metodo(24,y0,cw,h,INDIGO,"Tarjeta","Pasarela ~1,5% + tu gestión 1%  (≈ 2,5% en total)",
       "~ 2 días","Cobros puntuales o quien quiera pagar al instante.")
metodo(155,y0,cw,h,TEAL,"Recibo bancario (domiciliación)","Pasarela 0,8% con tope 5€ + tu gestión 1%",
       "~ 1 semana","El cobro MENSUAL fijo. Lo más barato en facturas grandes.")
para(24,y0+h+6,250,"El propietario firma el recibo una sola vez (IBAN + un clic, sin papeleo). A partir de ahí, automático.",11,MUTED)

# ── 5 · EJEMPLO REAL MAYO ──
pdf.add_page(); bg(WHITE)
kicker(24,24,"Ejemplo real · limpiezas de mayo (1.360,04 €)")
txt(24,34,"Lo mismo, con cada forma de cobro.",22,INK,True)
def calc(x,y,w,barcol,title,rows,total,recibe,cuando):
    h=104; card(x,y,w,h); pdf.set_fill_color(*barcol); pdf.rect(x,y,w,4,'F')
    txt(x+9,y+12,title,15,INK,True); ry=y+24
    for l,v in rows:
        txt(x+9,ry,l,11.5,SLATE,False); rtxt(x,ry,w-9,v,11.5,INK,True)
        pdf.set_draw_color(*LINE); pdf.line(x+9,ry+7.5,x+w-9,ry+7.5); ry+=10
    pdf.set_fill_color(*SOFT); pdf.rect(x,ry+1,w,16,'F')
    txt(x+9,ry+6,"Recibe en su cuenta",12.5,INK,True); rtxt(x,ry+5,w-9,recibe,15,OK,True)
    txt(x+9,ry+22,"Disponible en  "+cuando,12,barcol,True)
cw=118; y0=48
calc(24,y0,cw,INDIGO,"Con TARJETA",
     [("Cobro al propietario","1.360,04 €"),("Pasarela (~1,5%)","− 20,65 €"),("Tu gestión (1%)","− 13,60 €")],
     None,"1.325,79 €","~ 2 días")
calc(155,y0,cw,TEAL,"Con RECIBO (SEPA)",
     [("Cobro al propietario","1.360,04 €"),("Pasarela (0,8% · máx. 5€)","− 5,00 €"),("Tu gestión (1%)","− 13,60 €")],
     None,"1.341,44 €","~ 1 semana")
para(24,y0+112,250,"Mismo trabajo, dos opciones: el recibo le sale más barato; la tarjeta le llega antes. Lo eliges tú por cliente.",11,MUTED)

# ── 6 · TRANSPARENCIA ──
pdf.add_page(); bg(BG)
kicker(24,26,"Sin letra pequeña")
txt(24,36,"Todo desglosado. Cero sorpresas.",22,INK,True)
items=["Ves cada coste por separado: la pasarela y la gestión (1%).",
       "Sabes exactamente cuánto recibes y cuándo, antes de cobrar.",
       "El propietario aprueba cada mes: nadie cobra sin su OK.",
       "Cada cobro queda registrado: quién pagó, cuándo y cuánto.",
       "Las facturas se generan y guardan solas, ordenadas."]
y=64
for it in items:
    pdf.set_font('DJ','B',16); pdf.set_text_color(*OK); pdf.set_xy(24,y); pdf.cell(8,8,"✓")
    para(34,y+1,235,it,14.5,SLATE); y+=16

# ── 7 · TU INVERSIÓN ──
pdf.add_page(); bg(WHITE)
kicker(24,26,"Tu inversión en IALIMP")
txt(24,36,"Una cuota justa, que se adapta.",22,INK,True)
para(24,54,250,"La cuota mensual se adapta a tu equipo: una base más una parte por cada limpiadora "
     "activa ese mes. En temporada baja, con menos activas, pagas menos.",14,SLATE)
bx,by,bw=24,86,150; card(bx,by,bw,46)
ry=by
for l,v in [("Base del programa","80,00 €"),("15 limpiadoras activas × 20 €","300,00 €")]:
    txt(bx+8,ry+6,l,13,SLATE,False); rtxt(bx,ry+6,bw-8,v,13,INK,True)
    pdf.set_draw_color(*LINE); pdf.line(bx,ry+15.3,bx+bw,ry+15.3); ry+=15.3
pdf.set_fill_color(*SOFT); pdf.rect(bx,ry,bw,15.4,'F')
txt(bx+8,ry+5,"Cuota de este mes",14,INK,True); rtxt(bx,ry+4.5,bw-8,"380,00 €",16,INK,True)
para(bx+bw+12,by+8,86,"Se recalcula sola cada mes según las limpiadoras activas. Sin permanencia rígida.",12,MUTED)

# ── 8 · CIERRE ──
pdf.add_page(); bg(BG)
logo(24,30,28); txt(24,52,"¿Lo activamos?",24,INK,True)
para(24,70,242,"Lo dejamos probado y, cuando digas, empezamos. El propietario firma una vez "
     "y el resto va solo, mes a mes.",16,SLATE)
mini=[("Eliges por cliente","Tarjeta (rápido) o recibo (barato)."),
      ("Todo transparente","Cada coste y plazo, a la vista."),
      ("Acompañamiento","Lo configuramos juntos, paso a paso.")]
cw=78; x0=24; y0=104
for i,(t,d) in enumerate(mini):
    x=x0+i*(cw+10); card(x,y0,cw,42); pdf.set_fill_color(*BRAND); pdf.rect(x,y0,cw,3,'F')
    txt(x+8,y0+13,t,13,INK,True); para(x+8,y0+23,cw-16,d,11,MUTED)
footer("IALIMP — hola@ialimp.es · ialimp.es")

pdf.output("presentacion-sique-brilla.pdf")
print("OK")
