def read_file(file_name):
    graph = {}
    with open(file_name, 'r') as file:
        lines = file.readlines()
        for line in lines:
            pair = line.strip().split(',')[1]
            cur1, cur2 = pair.split('-')
            if cur1 not in graph:
                graph[cur1] = set()
            if cur2 not in graph:
                graph[cur2] = set()
            graph[cur1].add(cur2)
            graph[cur2].add(cur1)
    return graph

def find_triplets(graph):
    triplets = set()
    for cur1 in graph:
        for cur2 in graph[cur1]:
            for cur3 in graph[cur2]:
                if cur1 in graph[cur3] and cur1 != cur2 and cur2 != cur3 and cur1 != cur3:
                    # Sort the triplet to avoid duplicates
                    sorted_triplet = tuple(sorted([cur1, cur2, cur3]))
                    triplets.add(sorted_triplet)
    return triplets

def print_triplets(triplets):
    for triplet in triplets:
        print(triplet)

if __name__ == '__main__':
    graph = read_file('official_pool_data.txt')
    triplets = find_triplets(graph)
    print_triplets(triplets)
