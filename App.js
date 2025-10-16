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

    // Verifica se o array tem o item e o extrai
    const relatorioData = data && data.length > 0 ? data[0] : null;

    if (!relatorioData || !relatorioData.jsonIA) {
        return null; // Nenhum dado encontrado
    }

    // =========================================================================
    // MUDANÇAS CRÍTICAS APLICADAS AQUI:
    // 1. Acessar a estrutura aninhada (responses[0].output)
    // 2. Tratar a string de JSON (remover ```json\n) e fazer o parse.
    // =========================================================================
    
    const relatorioCompleto = relatorioData.jsonIA; 
    
    // Acessa a propriedade que contém o JSON formatado como string
    // Assumimos que o objeto principal (relatorioCompleto) possui a propriedade responses[0].output
    const respostaAninhada = relatorioCompleto.responses?.[0]?.output;
    
    if (!respostaAninhada || typeof respostaAninhada !== 'string') {
        throw new Error("Estrutura do relatório inválida: o JSON esperado não foi encontrado em responses[0].output.");
    }
    
    // Remove os marcadores de código (```json e ```) e espaços em branco desnecessários.
    // O modificador 's' garante que '.' também corresponda a quebras de linha (se o JSON estiver em várias linhas)
    let jsonString = respostaAninhada.replace(/^```json\s*/s, '').replace(/\s*```$/, '');
    
    // Tenta fazer o parse da string para objeto JavaScript
    try {
        return JSON.parse(jsonString); // Retorna o objeto final para o setParsedData
    } catch (e) {
        console.error("Erro ao fazer parse da string JSON aninhada. A string era:", jsonString);
        throw new Error("Formato de relatório inválido (Erro de JSON Parse): O objeto interno não é um JSON válido.");
    }
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
      const data = await fetchReportData(userId);

      if (!data) {
        setError(`Nenhum relatório encontrado para o usuário: ${userId}`);
        setParsedData(null);
        return;
      }
      
      // Define os dados (o Supabase já deve retornar o JSON/JSONB como objeto JS)
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
    flex: 1,
    backgroundColor: '#fff', 
    paddingTop: 50, 
  },
  scrollView: {
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