import React, { useState, useEffect } from 'react'; 
import { StyleSheet, View, Text, ScrollView, ActivityIndicator } from 'react-native';
// 1. Importa o cliente Supabase
import { supabase } from './supabase'; // Certifique-se de que o caminho está correto

// =========================================================================
// FUNÇÃO AUXILIAR: Extrair o UUID da Query String da URL
// =========================================================================

const getUserIdFromUrl = () => {
    // Esta lógica funciona porque o app rodará no contexto Web (Vercel)
    if (typeof window !== 'undefined') {
        try {
            const params = new URLSearchParams(window.location.search);
            // ATENÇÃO: 'idusuario' é a chave que você DEVE usar na URL do FlutterFlow
            return params.get('idusuario'); 
        } catch (e) {
            console.error("Erro ao tentar ler a URL no ambiente Web:", e);
            return null;
        }
    }
    // Retorno para ambientes que não são Web (apenas para evitar crash em dev)
    return null; 
};


export default function App() {
  // O estado agora armazena o JSON diretamente do Supabase
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true); // Adiciona estado de carregamento

  // Função para buscar os dados (JSON) diretamente da sua tabela do Supabase
  const fetchReportData = async (userId) => {
      
    if (!userId) {
        throw new Error('UUID do usuário não encontrado na URL (parâmetro idusuario).');
    }

    const { data, error } = await supabase
        .from('relatoriosIA')
        .select('jsonIA') 
        .eq('idusuario', userId) 
        .order('created_at', { ascending: false }) // Ordena pelo mais recente
        .limit(1); // Pega apenas o primeiro (mais recente)
    
    if (error) {
        console.error('Erro ao buscar dados no Supabase:', error);
        throw new Error(error.message || 'Erro desconhecido ao buscar dados.');
    }

    const relatorioData = data && data.length > 0 ? data[0] : null;

    if (!relatorioData || !relatorioData.jsonIA) {
        return null; // Nenhum dado encontrado
    }

    const jsonCompleto = relatorioData.jsonIA; 
    let objetoFinal = null;

    // --- FUNÇÃO AUXILIAR PARA LIMPAR E PARSEAR ---
    const cleanAndParse = (input) => {
        if (typeof input !== 'string') return null;
        
        // Remove os marcadores de código (```json e ```)
        let cleanedString = input.replace(/^```json\s*/s, '').replace(/\s*```$/, '');
        // Remove o caractere ilegal 160 (Non-breaking space)
        cleanedString = cleanedString.replace(/\u00A0/g, ' '); 

        try {
            return JSON.parse(cleanedString); 
        } catch (e) {
            return null; 
        }
    };

    // =========================================================================
    // LÓGICA DE EXTRAÇÃO REFORÇADA: Prioriza a estrutura final
    // =========================================================================

    // TENTATIVA A (Mais simples/direta): A coluna JÁ é o objeto que precisamos (Supabase fez o parse)
    // Usamos esta como prioridade se o Supabase lida com o campo JSONB/JSON corretamente.
    if (typeof jsonCompleto === 'object' && jsonCompleto.analise_de_maturidade && jsonCompleto.acoes_recomendadas) {
        objetoFinal = jsonCompleto;
    }
    
    // TENTATIVA B: O conteúdo da coluna é uma STRING DE JSON (com ou sem marcadores)
    if (!objetoFinal) {
        objetoFinal = cleanAndParse(jsonCompleto);
    }
    
    // TENTATIVA C: O conteúdo da coluna é um objeto COMPLEXO, e o JSON está aninhado
    if (!objetoFinal && typeof jsonCompleto === 'object') {
        const respostaAninhada = jsonCompleto.responses?.[0]?.output;
        if (respostaAninhada) {
            objetoFinal = cleanAndParse(respostaAninhada);
        }
    }
    
    // =========================================================================
    // VALIDAÇÃO FINAL E RETORNO (Retorna apenas as chaves necessárias)
    // =========================================================================

    if (objetoFinal && objetoFinal.analise_de_maturidade && objetoFinal.acoes_recomendadas) {
        // Encontramos o objeto que o componente de exibição espera.
        // Retorna APENAS o que é necessário para a exibição, ignorando o resto.
        return {
            analise_de_maturidade: objetoFinal.analise_de_maturidade,
            acoes_recomendadas: objetoFinal.acoes_recomendadas,
        };
    } 
    
    // Se nenhuma tentativa funcionou ou se a estrutura final estiver faltando, lança o erro
    throw new Error("Estrutura do relatório inválida: Não foi possível extrair as chaves 'analise_de_maturidade' e 'acoes_recomendadas' da coluna jsonIA.");
  };


  // Lógica para buscar os dados na montagem inicial
  const loadData = async () => {
    setError(''); 
    setLoading(true);
    
    // 1. OBTÉM O UUID DA URL
    const userId = getUserIdFromUrl();

    try {
      if (!userId) {
         throw new Error("UUID do usuário não fornecido na URL.");
      }
      
      // 2. BUSCA OS DADOS USANDO O UUID
      // Se houver erro de parsing ou estrutura, ele será capturado aqui.
      const data = await fetchReportData(userId);

      if (!data) {
        setError(`Nenhum relatório encontrado para o usuário: ${userId}`);
        setParsedData(null);
        return;
      }
      
      // Define os dados
      setParsedData(data); 

    } catch (e) {
      console.error(e);
      setError('Erro ao carregar o relatório: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Hook para executar a função de busca na montagem inicial
  useEffect(() => {
    loadData(); 
  }, []); // Array de dependências vazio: executa apenas na montagem

  // Componente auxiliar para exibir CADA Ação Recomendada em estilo de documento
  const AcaoItem = ({ acao, index }) => (
    <View style={styles.documentItem}>
      {/* Título da Ação: Enfatizado e numerado */}
      <Text style={styles.acaoTitulo}>
        {index + 1}. {acao.titulo} 
        <Text style={styles.acaoArea}> ({acao.area})</Text>
      </Text>
      
      {/* Descrição */}
      <Text style={styles.acaoDescricao}>{acao.descricao}</Text>
      
      {/* Ação Específica: Com destaque em amarelo */}
      <Text style={styles.acaoEspecifica}>
        Ação Tática: {''} 
        <Text style={styles.highlightText}>
          {acao.acao_especifica}
        </Text>
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      
      <ScrollView style={styles.scrollView}>

        {/* TITULO DO RELATÓRIO INICIAL */}
        <Text style={styles.reportHeader}>Análise de Maturidade Digital e Plano de Ação</Text>
        
        {/* EXIBIÇÃO DE ERROS */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        
        {/* EXIBIÇÃO DE CARREGAMENTO */}
        {loading && (
             <ActivityIndicator 
                size="large" 
                color="#438dc0" 
                style={{ marginTop: 50 }} 
            />
        )}

        {/* EXIBIÇÃO DE DADOS FORMATADOS - ESTILO DOCUMENTO */}
        {!loading && parsedData && (
          <View style={styles.documentBody}>
            
            {/* 1. ANÁLISE DE MATURIDADE (Resumo Executivo) */}
            <Text style={styles.sectionTitle}>Resumo da Maturidade</Text>
            
            <View style={styles.maturitySummary}>
                <Text style={styles.summaryStatus}>
                    {parsedData.analise_de_maturidade.status_geral}
                </Text>
                <Text style={styles.summaryFoco}>
                    {parsedData.analise_de_maturidade.foco}
                </Text>
            </View>


            {/* 2. AÇÕES RECOMENDADAS (Maior Ênfase) */}
            <Text style={styles.sectionTitle}>Plano de Ação Estratégico e Tático</Text>
            
            {/* LISTA DE AÇÕES */}
            {parsedData.acoes_recomendadas.map((acao, index) => (
              <AcaoItem key={index} acao={acao} index={index} />
            ))}

            <Text style={styles.footerNote}>
                Análise de Maturidade Digital e Plano de Ação. Feito por Shinko Systems.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// =========================================================================
// ESTILOS (STYLES) - Mantenha o que você já definiu
// =========================================================================

const styles = StyleSheet.create({
  container: {
    // ALTERAÇÃO PARA OCUPAR 100% DO WEBVIEW (o contêiner pai)
    flex: 1, 
    // width: 990, // REMOVIDO
    // height: 600, // REMOVIDO
    backgroundColor: '#fff', 
    paddingTop: 50, 
  },
  scrollView: {
    // Você pode usar o padding horizontal para simular a largura interna
    paddingHorizontal: 25, 
    paddingBottom: 40,
  },
  reportHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#438dc0',
    textAlign: 'center',
    paddingVertical: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  documentBody: {
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginTop: 25,
    marginBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingBottom: 5,
  },
  
  maturitySummary: {
    paddingBottom: 15,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  summaryStatus: {
    fontSize: 15,
    fontWeight: '600',
    color: '#c70e0e',
    marginBottom: 5,
  },
  summaryFoco: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },

  documentItem: {
    marginBottom: 20,
    paddingLeft: 0,
  },
  acaoTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#c70e0e',
    marginBottom: 5,
    lineHeight: 22,
  },
  acaoArea: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6c757d',
  },
  acaoDescricao: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 8,
  },
  acaoEspecifica: {
    fontSize: 14,
    color: '#000', 
    lineHeight: 20,
    marginVertical: 4, 
  },
  
  highlightText: {
    fontWeight: 'bold',
    backgroundColor: '#fff0a1',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3, 
    overflow: 'hidden', 
  },


  footerNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 40,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginBottom: 20,
  },
  errorText: {
    color: 'red',
    marginTop: 40,
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
});