# -*- coding: utf-8 -*-
from fpdf import FPDF

W, H = 297, 210  # A4 landscape mm
INDIGO=(79,70,229); BRAND=(99,102,241); SOFT=(238,242,255); INK=(30,27,75)
BG=(241,245,249); MUTED=(100,116,139); LINE=(226,232,240); OK=(22,163,74)
OKBG=(240,253,244); WHITE=(255,255,255); SLATE=(51,65,85); GREENB=(187,247,208)
DJ="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
DJB="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

pdf = FPDF(orientation='L', unit='mm', format='A4')
pdf.set_auto_page_break(False)
pdf.add_font('DJ','',DJ); pdf.add_font('DJ','B',DJB)

def bg(c):
    pdf.set_fill_color(*c); pdf.rect(0,0,W,H,'F')
def txt(x,y,s,size,color=INK,bold=False):
    pdf.set_font('DJ','B' if bold else '',size); pdf.set_text_color(*color)
    pdf.set_xy(x,y); pdf.cell(0,size*0.38,s)
def para(x,y,w,s,size,color=SLATE,bold=False,lh=1.5):
    pdf.set_font('DJ','B' if bold else '',size); pdf.set_text_color(*color)
    pdf.set_xy(x,y); pdf.multi_cell(w,size*0.40*lh,s)
def card(x,y,w,h,fill=WHITE):
    pdf.set_fill_color(*fill); pdf.set_draw_color(*LINE); pdf.set_line_width(0.3)
    pdf.rect(x,y,w,h,'DF')
def pill(x,y,s,fg=INDIGO,bgc=SOFT):
    pdf.set_font('DJ','B',10); w=pdf.get_string_width(s)+10
    pdf.set_fill_color(*bgc); pdf.rect(x,y,w,7.5,'F')
    pdf.set_text_color(*fg); pdf.set_xy(x,y+0.7); pdf.cell(w,6,s,align='C')
    return w
def logo(x,y,size):
    pdf.set_font('DJ','B',size)
    pdf.set_text_color(*INDIGO); pdf.set_xy(x,y); pdf.cell(0,size*0.4,"ia")
    wia=pdf.get_string_width("ia")
    pdf.set_text_color(*INK); pdf.set_xy(x+wia,y); pdf.cell(0,size*0.4,"limp")
def kicker(x,y,s):
    txt(x,y,s.upper(),10,BRAND,True)
def footer(s):
    txt(24,H-16,s,9,(148,163,184),False)

# ── 1 · PORTADA ──
pdf.add_page(); bg(WHITE)
logo(24,30,30)
pill(24,52,"Propuesta para Sique Brilla")
txt(24,70,"Cobrar a tus propietarios",30,INK,True)
txt(24,86,"solo con un clic.",30,INK,True)
para(24,108,235,"El propietario aprueba, paga con tarjeta y la factura se genera sola. "
     "Tú recibes el dinero puntual, sin transferencias ni recordatorios.",16,SLATE)
footer("IALIMP — gestión de limpiezas de pisos turísticos")

# ── 2 · EL PROBLEMA ──
pdf.add_page(); bg(BG)
kicker(24,26,"Cómo se cobra hoy")
txt(24,36,"Cobrar a final de mes cuesta tiempo y nervios.",22,INK,True)
probs=[("Perseguir el pago","Mandar el detalle, esperar la transferencia y recordar a los que se olvidan."),
       ("Facturas a mano","Cuadrar limpiezas, hacer la factura y enviarla, piso por piso."),
       ("Cobro tardío","El dinero entra cuando el propietario se acuerda, no cuando toca.")]
cw=78; gap=10; x0=24; y0=66
for i,(t,d) in enumerate(probs):
    x=x0+i*(cw+gap); card(x,y0,cw,72)
    pdf.set_fill_color(*INDIGO); pdf.rect(x,y0,cw,3,'F')
    txt(x+8,y0+14,t,15,INK,True)
    para(x+8,y0+26,cw-16,d,12,MUTED)

# ── 3 · LA SOLUCIÓN ──
pdf.add_page(); bg(WHITE)
kicker(24,26,"La solución con IALIMP")
txt(24,36,"Un flujo automático a fin de mes.",22,INK,True)
steps=[("Resumen automático","A fin de mes, el propietario recibe el resumen de todas las limpiezas del mes, con su importe."),
       ("El propietario da el OK","Lo revisa desde su portal privado y aprueba con un clic."),
       ("Cobro + factura, solos","Se le cobra la tarjeta, el dinero entra en tu cuenta y la factura se genera y guarda automáticamente.")]
y=62
for i,(t,d) in enumerate(steps):
    pdf.set_fill_color(*INDIGO); pdf.ellipse(24,y,13,13,'F')
    pdf.set_font('DJ','B',16); pdf.set_text_color(*WHITE); pdf.set_xy(24,y+2.2); pdf.cell(13,8,str(i+1),align='C')
    txt(44,y+0.5,t,16,INK,True)
    para(44,y+8,210,d,13,MUTED)
    y+=33
pdf.set_fill_color(*OKBG); pdf.set_draw_color(*GREENB); pdf.rect(24,y+2,250,16,'DF')
para(30,y+5.5,240,"Tú no tienes que perseguir a nadie ni hacer la factura: el sistema lo hace por ti.",12,(22,101,52),True)

# ── 4 · EJEMPLO REAL MAYO ──
pdf.add_page(); bg(BG)
kicker(24,26,"Ejemplo real · limpiezas de mayo (pisos de Alberto)")
txt(24,36,"Así habría funcionado en mayo.",22,INK,True)
txt(24,58,"1.360,04 €",54,INDIGO,True)
para(24,86,250,"Es lo que se pagó por las limpiezas de mayo. Con IALIMP, el cobro sería así:",14,SLATE)
bx,by,bw=24,100,150
card(bx,by,bw,46)
rows=[("Cobro al propietario","1.360,04 €",INK,False),
      ("Comisión única del servicio (2,5 %)","− 34,00 €",INK,False)]
ry=by
for i,(l,v,col,_) in enumerate(rows):
    txt(bx+8,ry+6,l,13,SLATE,False)
    pdf.set_font('DJ','B',13); pdf.set_text_color(*INK); pdf.set_xy(bx,ry+6); pdf.cell(bw-8,5,v,align='R')
    pdf.set_draw_color(*LINE); pdf.line(bx,ry+15.3,bx+bw,ry+15.3); ry+=15.3
pdf.set_fill_color(*SOFT); pdf.rect(bx,ry,bw,15.4,'F')
txt(bx+8,ry+5,"Recibes en tu cuenta",14,INK,True)
pdf.set_font('DJ','B',16); pdf.set_text_color(*OK); pdf.set_xy(bx,ry+4.5); pdf.cell(bw-8,6,"1.326,04 €",align='R')
para(bx+bw+12,by+8,86,"Una sola comisión del 2,5 % que ya incluye la pasarela de pago y la gestión. "
     "Cobro puntual, automático y con la factura generada sola.",12,(22,101,52),False)

# ── 5 · QUÉ GANAS ──
pdf.add_page(); bg(WHITE)
kicker(24,26,"Qué ganas tú")
txt(24,36,"Menos gestión, cobro asegurado.",22,INK,True)
items=["El dinero entra a tiempo, sin perseguir a los propietarios.",
       "Las facturas se generan solas y quedan guardadas y ordenadas.",
       "El propietario lo ve todo claro: limpiezas, fotos e importe.",
       "Pago con tarjeta, seguro, a través de Stripe.",
       "Cada cobro queda trazado: sabes quién pagó y cuándo."]
y=64
for it in items:
    pdf.set_font('DJ','B',16); pdf.set_text_color(*OK); pdf.set_xy(24,y); pdf.cell(8,8,"✓")
    para(34,y+1,230,it,15,SLATE)
    y+=17

# ── 6 · TU INVERSIÓN ──
pdf.add_page(); bg(BG)
kicker(24,26,"Tu inversión en IALIMP")
txt(24,36,"Una cuota justa, que se adapta.",22,INK,True)
para(24,54,250,"La cuota mensual se adapta a tu equipo: una base más una parte por cada limpiadora "
     "activa ese mes. En temporada baja, con menos limpiadoras activas, pagas menos.",14,SLATE)
bx,by,bw=24,86,150; card(bx,by,bw,46)
rws=[("Base del programa","80,00 €"),("15 limpiadoras activas × 20 €","300,00 €")]
ry=by
for l,v in rws:
    txt(bx+8,ry+6,l,13,SLATE,False)
    pdf.set_font('DJ','B',13); pdf.set_text_color(*INK); pdf.set_xy(bx,ry+6); pdf.cell(bw-8,5,v,align='R')
    pdf.set_draw_color(*LINE); pdf.line(bx,ry+15.3,bx+bw,ry+15.3); ry+=15.3
pdf.set_fill_color(*SOFT); pdf.rect(bx,ry,bw,15.4,'F')
txt(bx+8,ry+5,"Cuota de este mes",14,INK,True)
pdf.set_font('DJ','B',16); pdf.set_text_color(*INK); pdf.set_xy(bx,ry+4.5); pdf.cell(bw-8,6,"380,00 €",align='R')
para(bx+bw+12,by+8,86,"Se recalcula sola cada mes según las limpiadoras activas. Sin permanencia rígida.",12,MUTED)

# ── 7 · CIERRE ──
pdf.add_page(); bg(WHITE)
logo(24,30,28)
txt(24,52,"¿Lo activamos?",24,INK,True)
para(24,70,240,"Lo dejamos probado y, cuando digas, empezamos: tú solo introduces la tarjeta una vez "
     "y eliges la fecha de inicio. El resto, automático.",16,SLATE)
mini=[("Cobro a propietarios","Resumen → OK → cobro + factura."),
      ("Suscripción del programa","Se ajusta a tu equipo cada mes."),
      ("Acompañamiento","Lo configuramos juntos, paso a paso.")]
cw=78; x0=24; y0=104
for i,(t,d) in enumerate(mini):
    x=x0+i*(cw+10); card(x,y0,cw,42)
    pdf.set_fill_color(*BRAND); pdf.rect(x,y0,cw,3,'F')
    txt(x+8,y0+13,t,13,INK,True); para(x+8,y0+23,cw-16,d,11,MUTED)
footer("IALIMP — hola@ialimp.es · ialimp.es")

pdf.output("presentacion-sique-brilla.pdf")
print("OK")
