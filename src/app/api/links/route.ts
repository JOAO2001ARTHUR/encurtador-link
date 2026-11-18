import { NextRequest, NextResponse } from 'next/server';
import { getAllLinks, getLinkByCode, getStorageStatus, saveLink } from '@/lib/storage';
import { CreateLinkInput, ShortLink } from '@/lib/types';
import { generateRandomSlug, isValidUrl, normalizeUrl, RESERVED_SLUGS, sanitizeSlug } from '@/lib/utils';

export async function GET() {
  try {
    const [links, storage] = await Promise.all([
      getAllLinks(),
      getStorageStatus(),
    ]);

    const totalClicks = links.reduce((sum, link) => sum + (link.clicks || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        links,
        stats: {
          totalLinks: links.length,
          totalClicks,
        },
        storage,
      },
    });
  } catch (error) {
    console.error('Error fetching links:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao carregar links' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateLinkInput = await request.json();

    if (!body.targetUrl || typeof body.targetUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'A URL de destino é obrigatória.' },
        { status: 400 }
      );
    }

    const normalizedTargetUrl = normalizeUrl(body.targetUrl);
    if (!isValidUrl(normalizedTargetUrl)) {
      return NextResponse.json(
        { success: false, error: 'URL de destino inválida. Verifique o formato informado.' },
        { status: 400 }
      );
    }

    let code = '';
    if (body.code && body.code.trim().length > 0) {
      code = sanitizeSlug(body.code);

      if (code.length < 2) {
        return NextResponse.json(
          { success: false, error: 'O slug personalizado deve ter pelo menos 2 caracteres.' },
          { status: 400 }
        );
      }

      if (RESERVED_SLUGS.has(code)) {
        return NextResponse.json(
          { success: false, error: `O slug "${code}" é uma palavra reservada do sistema.` },
          { status: 400 }
        );
      }

      const existing = await getLinkByCode(code);
      if (existing) {
        return NextResponse.json(
          { success: false, error: `O slug "${code}" já está em uso. Escolha outro.` },
          { status: 409 }
        );
      }
    } else {
      // Generate a random slug with collision avoidance
      let attempts = 0;
      let generated = '';
      while (attempts < 5) {
        generated = generateRandomSlug(6);
        const existing = await getLinkByCode(generated);
        if (!existing && !RESERVED_SLUGS.has(generated)) {
          break;
        }
        attempts++;
      }
      code = generated;
    }

    const newLink: ShortLink = {
      code,
      targetUrl: normalizedTargetUrl,
      title: body.title?.trim() || undefined,
      clicks: 0,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    const saved = await saveLink(newLink);
    if (!saved) {
      return NextResponse.json(
        { success: false, error: 'Erro ao persistir o link no armazenamento.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Link encurtado criado com sucesso!',
        data: newLink,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating link:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao processar requisição.' },
      { status: 500 }
    );
  }
}
