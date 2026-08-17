#!/usr/bin/env python3
import struct
import sys
import zlib

PNG_SIGNATURE=b'\x89PNG\r\n\x1a\n'

def read_png(path):
    data=open(path,'rb').read()
    if not data.startswith(PNG_SIGNATURE):
        raise ValueError(f'{path}: not a PNG')
    pos=8; width=height=bit_depth=color_type=None; compressed=[]
    while pos<len(data):
        length=struct.unpack('>I',data[pos:pos+4])[0]; pos+=4
        chunk_type=data[pos:pos+4]; pos+=4
        chunk=data[pos:pos+length]; pos+=length+4
        if chunk_type==b'IHDR':
            width,height,bit_depth,color_type,compression,filter_method,interlace=struct.unpack('>IIBBBBB',chunk)
            if bit_depth!=8 or compression!=0 or filter_method!=0 or interlace!=0:
                raise ValueError(f'{path}: unsupported PNG format')
        elif chunk_type==b'IDAT': compressed.append(chunk)
        elif chunk_type==b'IEND': break
    channels={2:3,6:4}.get(color_type)
    if channels is None: raise ValueError(f'{path}: unsupported color type {color_type}')
    raw=zlib.decompress(b''.join(compressed)); stride=width*channels
    rows=[]; cursor=0; previous=bytearray(stride)
    for _ in range(height):
        filter_type=raw[cursor]; cursor+=1
        scan=bytearray(raw[cursor:cursor+stride]); cursor+=stride
        recon=bytearray(stride)
        for i,value in enumerate(scan):
            left=recon[i-channels] if i>=channels else 0
            up=previous[i]
            upper_left=previous[i-channels] if i>=channels else 0
            if filter_type==0: result=value
            elif filter_type==1: result=(value+left)&255
            elif filter_type==2: result=(value+up)&255
            elif filter_type==3: result=(value+((left+up)//2))&255
            elif filter_type==4: result=(value+paeth(left,up,upper_left))&255
            else: raise ValueError(f'{path}: unsupported filter {filter_type}')
            recon[i]=result
        rows.append(recon); previous=recon
    return width,height,channels,rows

def paeth(a,b,c):
    p=a+b-c; pa=abs(p-a); pb=abs(p-b); pc=abs(p-c)
    if pa<=pb and pa<=pc:return a
    if pb<=pc:return b
    return c

def compare(base_path,current_path,max_ratio,tolerance=28):
    bw,bh,bc,base=read_png(base_path); cw,ch,cc,current=read_png(current_path)
    if (bw,bh)!=(cw,ch):
        raise SystemExit(f'VISUAL_REGRESSION dimensions baseline={bw}x{bh} current={cw}x{ch}')
    total=bw*bh; changed=0; absolute=0
    for y in range(bh):
        for x in range(bw):
            bi=x*bc; ci=x*cc
            base_rgb=base[y][bi:bi+3]; current_rgb=current[y][ci:ci+3]
            delta=max(abs(int(base_rgb[i])-int(current_rgb[i])) for i in range(3))
            absolute+=sum(abs(int(base_rgb[i])-int(current_rgb[i])) for i in range(3))
            if delta>tolerance: changed+=1
    ratio=changed/total if total else 0
    mean=absolute/(total*3*255) if total else 0
    print(f'visual-diff {current_path}: changed={ratio:.3%} mean={mean:.3%} tolerance={tolerance} threshold={max_ratio:.1%}')
    if ratio>max_ratio:
        raise SystemExit(f'VISUAL_REGRESSION changed pixel ratio {ratio:.3%} exceeds {max_ratio:.1%}')

if __name__=='__main__':
    if len(sys.argv)<4:
        raise SystemExit('usage: compare-png.py BASELINE CURRENT MAX_CHANGED_RATIO [CHANNEL_TOLERANCE]')
    compare(sys.argv[1],sys.argv[2],float(sys.argv[3]),int(sys.argv[4]) if len(sys.argv)>4 else 28)
