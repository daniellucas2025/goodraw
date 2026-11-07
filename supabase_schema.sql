-- ==============================================================================
-- SCHEMA SUPABASE: GOO DRAW & STUDY CLOUD ECOSYSTEM
-- Suporte completo a múltiplos dispositivos: PC, Celular (Android/iOS) e Tablet.
-- Permite sincronização em tempo real de desenhos, prints, grifos e caderno de erros.
-- ==============================================================================

-- 1. Habilitar extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Páginas & Questões Acessadas
CREATE TABLE IF NOT EXISTS public.study_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    domain TEXT,
    title TEXT,
    subject TEXT,
    topic TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para busca rápida por usuário e URL
CREATE INDEX IF NOT EXISTS idx_study_pages_user_url ON public.study_pages(user_id, url);

-- 3. Tabela de Desenhos Vetoriais sobre Questões (PageInk / Strokes)
CREATE TABLE IF NOT EXISTS public.drawings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    strokes JSONB NOT NULL DEFAULT '[]'::jsonb,
    preview_thumbnail TEXT, -- base64 ou link da miniatura
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drawings_user_url ON public.drawings(user_id, url);

-- 4. Tabela de Prints & Capturas de Questões (Caderno de Erros e Recortes)
CREATE TABLE IF NOT EXISTS public.screenshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    url TEXT,
    title TEXT DEFAULT 'Questão Capturada',
    image_url TEXT NOT NULL, -- URL no Storage Bucket ou Data URL
    note TEXT,               -- Anotação ou motivo do erro
    tags TEXT[] DEFAULT '{}',
    is_error_notebook BOOLEAN DEFAULT true,
    difficulty TEXT DEFAULT 'media', -- facil, media, dificil
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_screenshots_user ON public.screenshots(user_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_error_notebook ON public.screenshots(user_id, is_error_notebook);

-- 5. Tabela de Grifos em Leis & Artigos (Highlights)
CREATE TABLE IF NOT EXISTS public.highlights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    quote TEXT NOT NULL,
    color TEXT DEFAULT 'yellow',
    note TEXT,
    anchor_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_highlights_user_url ON public.highlights(user_id, url);

-- 6. Tabela de Anotações e Resumos Rápidos
CREATE TABLE IF NOT EXISTS public.study_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    subject TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_notes_user ON public.study_notes(user_id);

-- ==============================================================================
-- CONFIGURAÇÃO DE SEGURANÇA (Row Level Security - RLS)
-- Garante que cada usuário veja e modifique apenas seus próprios dados.
-- ==============================================================================

ALTER TABLE public.study_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_notes ENABLE ROW LEVEL SECURITY;

-- Políticas para study_pages
CREATE POLICY "Users can manage their study pages"
    ON public.study_pages FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Políticas para drawings
CREATE POLICY "Users can manage their drawings"
    ON public.drawings FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Políticas para screenshots
CREATE POLICY "Users can manage their screenshots"
    ON public.screenshots FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Políticas para highlights
CREATE POLICY "Users can manage their highlights"
    ON public.highlights FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Políticas para study_notes
CREATE POLICY "Users can manage their study notes"
    ON public.study_notes FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Permitir acesso público/anônimo se desejar modo sem login com client ID anônimo
-- (Descomente abaixo para permitir testes anônimos compartilhados com anon key)
-- CREATE POLICY "Anon drawings access" ON public.drawings FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "Anon screenshots access" ON public.screenshots FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "Anon highlights access" ON public.highlights FOR ALL TO anon USING (true) WITH CHECK (true);

-- ==============================================================================
-- STORAGE BUCKET PARA PRINTS & IMAGENS
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('study_screenshots', 'study_screenshots', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access for Screenshots"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'study_screenshots');

CREATE POLICY "Authenticated users can upload screenshots"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'study_screenshots' AND auth.role() = 'authenticated');
