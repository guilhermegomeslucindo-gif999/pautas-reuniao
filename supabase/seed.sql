-- Clientes iniciais do Squad D
insert into public.squad_clientes (id, nome, ordem, squad) values
('c01','Marmoraria Teixeira Stones',1,'D'),
('c02','Marmoraria Ambiente Padrão',2,'D'),
('c03','Marmoraria Trevo',3,'D'),
('c04','Prolar',4,'D'),
('c05','Marmoraria Eimagran',5,'D'),
('c06','Marmoraria GVI',6,'D'),
('c07','Marmoraria Nacional',7,'D'),
('c08','Marmoraria Real',8,'D'),
('c09','Occhio Blu',9,'D'),
('c10','Marmoraria Santa Felicidade',10,'D'),
('c11','Ricardo Estuqui',11,'D'),
('c12','Marmoraria Bella Mármores',12,'D'),
('c13','Marmoraria BR',13,'D'),
('c14','Marmoraria Orus Concept',14,'D'),
('c15','Nobile Marmo',15,'D'),
('c16','Marmoraria Jundiaí',16,'D'),
('c17','Marmoraria 4d',17,'D')
on conflict (id) do nothing;
