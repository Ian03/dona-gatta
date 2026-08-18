alter table public.colecoes
add column if not exists parcelamento_maximo integer not null default 5;

alter table public.colecoes
drop constraint if exists colecoes_parcelamento_maximo_check;

alter table public.colecoes
add constraint colecoes_parcelamento_maximo_check
check (parcelamento_maximo between 1 and 12);

update public.colecoes
set parcelamento_maximo = 5
where parcelamento_maximo is null;
