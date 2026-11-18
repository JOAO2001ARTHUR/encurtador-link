import { NextRequest, NextResponse } from 'next/server';
import { deleteLink, getLinkByCode, saveLink } from '@/lib/storage';
import { UpdateLinkInput } from '@/lib/types';
import { isValidUrl, normalizeUrl } from '@/lib/utils';

interface RouteContext {
  params: Promise<{
    code: string;
  }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { code } = await context.params;
    const link = await getLinkByCode(code);

    if (!link) {
      return NextResponse.json(
        { success: false, error: 'Link não encontrado.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: link });
  } catch (error) {
    console.error('Error fetching link:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar link.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { code } = await context.params;
    const link = await getLinkByCode(code);

    if (!link) {
      return NextResponse.json(
        { success: false, error: 'Link não encontrado.' },
        { status: 404 }
      );
    }

    const body: UpdateLinkInput = await request.json();

    if (body.targetUrl !== undefined) {
      const normalized = normalizeUrl(body.targetUrl);
      if (!isValidUrl(normalized)) {
        return NextResponse.json(
          { success: false, error: 'URL de destino inválida.' },
          { status: 400 }
        );
      }
      link.targetUrl = normalized;
    }

    if (body.title !== undefined) {
      link.title = body.title.trim() || undefined;
    }

    if (body.isActive !== undefined) {
      link.isActive = Boolean(body.isActive);
    }

    await saveLink(link);

    return NextResponse.json({
      success: true,
      message: 'Link atualizado com sucesso!',
      data: link,
    });
  } catch (error) {
    console.error('Error updating link:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao atualizar link.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { code } = await context.params;
    const link = await getLinkByCode(code);

    if (!link) {
      return NextResponse.json(
        { success: false, error: 'Link não encontrado.' },
        { status: 404 }
      );
    }

    await deleteLink(code);

    return NextResponse.json({
      success: true,
      message: `Link "${code}" excluído com sucesso!`,
    });
  } catch (error) {
    console.error('Error deleting link:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao excluir link.' },
      { status: 500 }
    );
  }
}
